每一篇筆記要做兩件事。

## 步驟

1. 在 `notes/` 資料夾新增一個 `.md` 檔，檔名就是這篇的代號（slug），例如 `my-first-note.md`
2. 打開 `data/notes.json`，在裡面加一筆：

```json
{
  "slug": "my-first-note",
  "title": "標題",
  "date": "2026-11-22",
  "tags": ["標籤一", "標籤二"],
  "summary": "列表上顯示的一行說明（可以不寫）"
}
```

`slug` 要跟檔名（不含 `.md`）一模一樣。

## 放圖片

圖片用這個寫法：

```
![圖片說明](images/photo.jpg "這裡的文字會變成圖說")
```

網址可以是 repo 裡的 `images/` 資料夾，也可以是圖床的完整網址。圖說（引號那段）可以不寫。

## 活動頁

做法完全一樣，只是改成放在 `events/` 資料夾、登記在 `data/events.json`，另外可以多寫 `place`（地點）和 `result`（結果）。
