# 個人網站

GitHub Pages 靜態網站，三個頁面：大小事、活動、關於我。

## 資料夾

```
index.html        網站入口
css/style.css     樣式
js/app.js         換頁、讀檔、顯示
data/             列表資料 (notes.json、events.json、about.json)
notes/            每篇筆記的內容 (.md)
events/           每則活動的內容 (.md)
images/           圖片 (自己建立這個資料夾)
about.md          自我介紹
```

## 新增筆記

1. `notes/` 新增 `xxx.md`
2. 在 `data/notes.json` 加一筆，`slug` 對應檔名

詳細寫法看網站裡的〈怎麼新增一篇筆記〉。

## 在自己電腦上預覽

直接雙擊 `index.html` 會讀不到檔案。在這個資料夾開終端機：

```
python -m http.server
```

然後打開 http://localhost:8000

## 上線

把整個資料夾的內容推到 `你的帳號.github.io` 這個 repo，Settings → Pages 選 main branch。
