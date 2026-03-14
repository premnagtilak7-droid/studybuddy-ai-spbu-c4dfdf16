// Input sanitization and security utilities

/**
 * Sanitize text input to prevent XSS attacks
 * Strips HTML tags and encodes special characters
 */
export function sanitizeInput(input: string): string {
  if (!input) return input;
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Sanitize input for display (strips tags but keeps readable text)
 */
export function stripHtmlTags(input: string): string {
  if (!input) return input;
  return input.replace(/<[^>]*>/g, "").trim();
}

/**
 * Validate file upload - only allow safe image types
 * Checks both extension and MIME type
 */
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: "Only JPG, PNG and WebP images are allowed." };
  }

  // Check file extension
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    return { valid: false, error: "Invalid file extension. Only .jpg, .png, .webp allowed." };
  }

  // Check for double extensions (e.g., file.exe.jpg)
  const parts = file.name.split(".");
  if (parts.length > 2) {
    const suspiciousExts = [".exe", ".bat", ".cmd", ".sh", ".php", ".js", ".html", ".svg"];
    for (const part of parts.slice(0, -1)) {
      if (suspiciousExts.some(s => s === "." + part.toLowerCase())) {
        return { valid: false, error: "Suspicious file detected. Upload rejected." };
      }
    }
  }

  // Check file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return { valid: false, error: "Image must be under 2MB." };
  }

  // Check magic bytes (file signature)
  return { valid: true };
}

/**
 * Async validation that checks file magic bytes
 */
export async function validateImageFileDeep(file: File): Promise<{ valid: boolean; error?: string }> {
  const basicCheck = validateImageFile(file);
  if (!basicCheck.valid) return basicCheck;

  // Read first 4 bytes to check magic number
  const buffer = await file.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const isJPEG = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
  const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
  const isWEBP = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;

  if (!isJPEG && !isPNG && !isWEBP) {
    return { valid: false, error: "File content doesn't match an image. Upload rejected for security." };
  }

  return { valid: true };
}

/**
 * Sanitize a URL to prevent javascript: protocol attacks
 */
export function sanitizeUrl(url: string): string {
  if (!url) return url;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:") || trimmed.startsWith("vbscript:")) {
    return "";
  }
  return url;
}

/**
 * Validate and limit text input length
 */
export function validateTextLength(input: string, maxLength: number): string {
  if (!input) return input;
  return input.slice(0, maxLength);
}
