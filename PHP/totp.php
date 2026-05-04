<?php
/* ===================================
   TOTP LIBRARY — Pure PHP, no Composer
   RFC 6238 Time-Based One-Time Passwords
   Compatible with Google Authenticator,
   Authy, Microsoft Authenticator, etc.
   =================================== */

class TOTP
{
    // ── Constants ────────────────────────────────────────
    const DIGITS    = 6;       // OTP length
    const PERIOD    = 30;      // seconds per step
    const ALGORITHM = 'sha1';  // RFC 6238 default
    const WINDOW    = 1;       // ±1 step tolerance (±30s)
    const SECRET_BYTES = 20;   // 160-bit secret

    // ── Base32 alphabet (RFC 4648) ────────────────────────
    private static string $base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * Generate a random Base32-encoded secret.
     * 20 bytes → 32-char Base32 string
     */
    public static function generateSecret(): string
    {
        $bytes  = random_bytes(self::SECRET_BYTES);
        $secret = self::base32Encode($bytes);
        // Strip '=' padding — 20 bytes produces exactly 32 Base32 chars (no padding needed)
        // but rtrim ensures compatibility if SECRET_BYTES is ever changed
        return strtoupper(rtrim($secret, '='));
    }

    /**
     * Encrypt the secret before storing in DB.
     * Uses AES-256-CBC with a key derived from APP_KEY.
     */
    public static function encryptSecret(string $secret): string
    {
        $key    = self::deriveKey();
        $iv     = random_bytes(16);
        $cipher = openssl_encrypt($secret, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
        // Store as base64(iv + ciphertext)
        return base64_encode($iv . $cipher);
    }

    /**
     * Decrypt a stored secret.
     */
    public static function decryptSecret(string $encrypted): string
    {
        $key  = self::deriveKey();
        $raw  = base64_decode($encrypted);
        $iv   = substr($raw, 0, 16);
        $data = substr($raw, 16);
        $plain = openssl_decrypt($data, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
        return $plain !== false ? $plain : '';
    }

    /**
     * Generate current TOTP code(s).
     * Returns the code for the current 30-second window.
     */
    public static function generateCode(string $secret, ?int $timestamp = null): string
    {
        $timestamp = $timestamp ?? time();
        $counter   = (int)floor($timestamp / self::PERIOD);
        return self::hotp($secret, $counter);
    }

    /**
     * Verify a submitted OTP.
     * Checks current window ± WINDOW steps for clock drift.
     */
    public static function verifyCode(string $secret, string $code, ?int $timestamp = null): bool
    {
        $code = trim($code);
        if (!preg_match('/^\d{6}$/', $code)) {
            return false;
        }
        $timestamp = $timestamp ?? time();
        $counter   = (int)floor($timestamp / self::PERIOD);

        for ($i = -self::WINDOW; $i <= self::WINDOW; $i++) {
            $expected = self::hotp($secret, $counter + $i);
            // Constant-time comparison
            if (hash_equals($expected, $code)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Build the otpauth:// URI used to generate a QR code.
     */
    public static function buildOtpAuthUri(
        string $secret,
        string $accountName,
        string $issuer = 'Shipyard CMS'
    ): string {
        // Per otpauth:// spec:
        // - Label (issuer:account) components are percent-encoded
        // - secret= value must be raw Base32 uppercase WITHOUT '=' padding
        //   and must NOT be percent-encoded — authenticator apps parse it raw
        $cleanSecret = strtoupper(rtrim($secret, '='));

        return sprintf(
            'otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=%d&period=%d',
            rawurlencode($issuer),
            rawurlencode($accountName),
            $cleanSecret,              // NO rawurlencode — secret must be raw Base32
            rawurlencode($issuer),
            self::DIGITS,
            self::PERIOD
        );
    }

    /**
     * Return the Google Chart API URL for a QR code image.
     * We use an offline-capable approach: return the otpauth URI
     * and let the frontend render via qrcode.js library.
     */
    public static function getQrData(string $secret, string $email): array
    {
        // Strip '=' padding from the secret — authenticator apps require
        // clean Base32 (no padding) for both URI and manual entry
        $cleanSecret = strtoupper(rtrim($secret, '='));
        $uri = self::buildOtpAuthUri($cleanSecret, $email);
        return [
            'uri'    => $uri,
            'secret' => $cleanSecret,  // shown for manual entry — no padding
        ];
    }

    // ── HOTP (RFC 4226) ───────────────────────────────────
    private static function hotp(string $secret, int $counter): string
    {
        $keyBytes     = self::base32Decode($secret);
        $counterBytes = pack('J', $counter);          // 8-byte big-endian
        $hmac         = hash_hmac(self::ALGORITHM, $counterBytes, $keyBytes, true);
        $offset       = ord($hmac[strlen($hmac) - 1]) & 0x0f;
        $code         = (
            ((ord($hmac[$offset])     & 0x7f) << 24) |
            ((ord($hmac[$offset + 1]) & 0xff) << 16) |
            ((ord($hmac[$offset + 2]) & 0xff) <<  8) |
             (ord($hmac[$offset + 3]) & 0xff)
        ) % (10 ** self::DIGITS);
        return str_pad((string)$code, self::DIGITS, '0', STR_PAD_LEFT);
    }

    // ── Base32 encode ─────────────────────────────────────
    public static function base32Encode(string $bytes): string
    {
        $chars  = self::$base32Chars;
        $output = '';
        $buffer = 0;
        $bits   = 0;
        foreach (str_split($bytes) as $byte) {
            $buffer = ($buffer << 8) | ord($byte);
            $bits  += 8;
            while ($bits >= 5) {
                $bits  -= 5;
                $output .= $chars[($buffer >> $bits) & 31];
            }
        }
        if ($bits > 0) {
            $output .= $chars[($buffer << (5 - $bits)) & 31];
        }
        // Pad to multiple of 8
        while (strlen($output) % 8 !== 0) {
            $output .= '=';
        }
        return $output;
    }

    // ── Base32 decode ─────────────────────────────────────
    public static function base32Decode(string $encoded): string
    {
        $chars   = self::$base32Chars;
        $encoded = strtoupper(str_replace([' ', "\r", "\n", '-'], '', $encoded));
        $encoded = rtrim($encoded, '=');
        $output  = '';
        $buffer  = 0;
        $bits    = 0;
        foreach (str_split($encoded) as $char) {
            $pos = strpos($chars, $char);
            if ($pos === false) continue;
            $buffer = ($buffer << 5) | $pos;
            $bits  += 5;
            if ($bits >= 8) {
                $bits  -= 8;
                $output .= chr(($buffer >> $bits) & 0xff);
            }
        }
        return $output;
    }

    // ── AES key derivation ────────────────────────────────
    private static function deriveKey(): string
    {
        // APP_KEY should be defined in config.php or as an env variable
        $appKey = defined('APP_KEY') ? APP_KEY : 'shipyard-2fa-default-key-change-me';
        return hash('sha256', $appKey, true);  // 32 bytes for AES-256
    }
}
?>
