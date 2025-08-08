package com.example.docs.security;

public final class TokenValidator {

  private TokenValidator() {}

  // เวอร์ชันเบื้องต้น: อนุญาตถ้าไม่มี token; ถ้ามี token ให้ตรวจรูปแบบอย่างหยาบ
  public static boolean isValid(String token, String docId) {
    if (token == null || token.isBlank()) {
      return false; // เพื่อความชัดเจน: เมื่อเรียกใช้ isValid ต้องการตรวจว่า token "ถูกต้อง"
    }
    // ตัวอย่างเชิงสาธิต: ความยาว > 10 และต้องไม่ใช่ค่าเดิมซ้ำๆ
    // (โปรดเปลี่ยนเป็นการตรวจ JWT/HMAC จริงในเฟสถัดไป)
    return token.length() > 10 && !token.chars().allMatch(ch -> ch == token.charAt(0));
  }
}
