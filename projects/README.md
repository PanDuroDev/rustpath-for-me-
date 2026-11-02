# المشاريع العملية

يُحفظ كل مشروع في مجلد مستقل، ويكون مشروع Cargo مستقلاً له ملف `Cargo.toml` ومجلد `src/` وملف `src/main.rs` أو `src/lib.rs` بحسب نوع المشروع.

مثال للبنية:

```text
projects/
  calculator/
    Cargo.toml
    src/
      main.rs
  task-manager/
    Cargo.toml
    src/
      main.rs
```

لا تضع عدة مشاريع Cargo في مجلد واحد أو تشارك بينها ملف manifest. يمكن لكل مشروع أن يملك اختبارات وملف README خاصاً به عند الحاجة.
