# 節日祭祀備忘手冊

家中節日祭祀（供品、金紙、流程、禁忌、家庭傳統）的備忘網站，純靜態網頁，部署在 GitHub Pages。

## 功能
- 首頁顯示國曆、農曆、目前時間，以及「下一個節日」倒數與近期提醒
- 節日內頁：日期、供品清單（可勾選）、金紙、流程、禁忌、注意事項、家庭傳統
- 字體可用底部滑桿自由放大縮小（18～48），會記住設定
- 可匯出 Word（.docx）或直接列印
- 農曆與節氣自動換算，清明、冬至每年自動更新

## 檔案結構
| 檔案 | 用途 |
|---|---|
| `data/festivals.json` | **所有節日內容都在這裡**，日後只需要改這個檔案 |
| `index.html` | 網頁外框 |
| `css/style.css` | 配色與版面 |
| `js/lunar.js` | 農曆與節氣換算 |
| `js/viewmodel.js` | 把資料整理成版面（網頁與 Word 共用） |
| `js/docx.js` | Word 匯出 |
| `js/app.js` | 網頁互動 |

## 修改節日內容
編輯 `data/festivals.json` 即可。每個節日是 `festivals` 裡的一筆，常用欄位：

- `name`：節日名稱　`targets`：祭拜對象
- `date`：日期規則（見下）
- `time`：拜拜時間　`earlyWindow`：可提早祭拜的時間
- `offerings`：供品，`[{"group":"供品","items":["水果5種"]}]`
- `paper`：金紙，`[{"name":"四方金","count":"1只"}]`
- `steps`：流程，每一步可有 `time`、`target`、`text`、`offerings`、`paper`
- `placement`、`taboos`、`notes`、`family`：擺放方式、禁忌、注意事項、家庭傳統
- `supplement`：`origin`（由來）與 `wikipedia`（連結），與原始內容分開

日期規則 `date.type`：
- `lunar`：農曆固定日，`month`、`day`，可加 `alsoDays`（備選日）
- `lunarLastDay`：農曆某月最後一天（除夕）
- `solarTerm`：節氣，`term`（例如「冬至」）、`offsetDays`（前後天數）、`showFromOffsetDays`（從節氣前幾天開始提醒）

原文有劃線的項目：在步驟加上 `"strike": true` 與 `"remark": "說明"`。
名詞解釋：在 `glossary` 加一筆，網頁中出現該詞會自動變成可點選。

## 注意
- 網站內容只放可以公開的資料；GitHub Pages 網址知道的人都看得到（已加 noindex，不會被搜尋引擎收錄）。
- 農曆使用瀏覽器內建曆法，若與官方農民曆差一天，可在 `js/lunar.js` 的 `FIXES` 加一行修正。
- 勾選紀錄只存在各人自己的裝置，每年自動重新開始。
