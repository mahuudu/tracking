# NPM Publish Checklist

## ✅ Đã hoàn thành

1. ✅ **package.json** - Đã tạo với:
   - Metadata cơ bản (name, version, description, keywords)
   - Exports cho main entry và react subpath
   - Peer dependencies (React)
   - Files field để chỉ publish src/ và README.md

2. ✅ **README.md** - Đã tạo ở root với:
   - Phần Installation
   - Tất cả import paths đã được update từ `@/src/tracking` → `@mahuudu/tracking`
   - Đầy đủ documentation

3. ✅ **.npmignore** - Đã tạo để exclude:
   - Test files
   - Config files không cần thiết
   - Development files

4. ✅ **tsconfig.json** - Đã tạo cho TypeScript support

5. ✅ **src/index.ts** - Đã thêm React exports

## ⚠️ Cần cập nhật trước khi publish

### 1. Package Name
Trong `package.json`, thay đổi:
```json
"name": "@mahuudu/tracking"
```
→ Thành tên package thực tế của bạn (ví dụ: `@yourcompany/tracking` hoặc `tracking-framework`)

### 2. Repository URL
Trong `package.json`, cập nhật:
```json
"repository": {
  "type": "git",
  "url": "https://github.com/mahuudu/tracking.git"
}
```

### 3. Author
Trong `package.json`, thêm:
```json
"author": "Your Name <your.email@example.com>"
```

### 4. License File
Tạo file `LICENSE` (MIT license được recommend trong package.json)

### 5. Version
Kiểm tra version trong:
- `package.json` → `"version": "1.0.0"`
- `src/browser/adapter.ts` → `TRACKING_VERSION = '1.0.0'` (nên sync với package.json)

## 📦 Các bước publish

### 1. Login vào npm
```bash
npm login
```

### 2. Kiểm tra package
```bash
npm pack --dry-run
# Xem những files sẽ được publish
```

### 3. Test local install
```bash
npm pack
# Tạo .tgz file, test install vào project khác
```

### 4. Publish
```bash
# Public package
npm publish --access public

# Hoặc nếu là scoped package (@mahuudu/tracking)
npm publish --access public
```

### 5. Verify
```bash
npm view @mahuudu/tracking
```

## 🔄 Cập nhật version cho lần publish tiếp theo

Sử dụng `npm version`:
```bash
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

Sau đó publish:
```bash
npm publish --access public
```

## 📝 Notes

- Package này publish TypeScript source trực tiếp (không build), phù hợp với modern bundlers
- Nếu muốn publish compiled JS, cần thêm build step và update `main`, `types`, `exports` trong package.json
- React là peer dependency (không bắt buộc nếu chỉ dùng core tracking, nhưng cần cho React hooks)

