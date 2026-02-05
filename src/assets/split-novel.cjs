const fs = require('fs');
const path = require('path');

// 读取西游记全文（假设文本文件每行一个段落）
const novelText = fs.readFileSync(path.join(__dirname, 'xiyouji.txt'), 'utf8');
const paragraphs = novelText.split('\n') // 按换行拆分段落
  .map(p => p.trim())
  .filter(p => p.length > 50); // 过滤过短段落（适合打字）

// 按回目分组（可选，增强可读性）
const chapterRegex = /第[一二三四五六七八九十百]+回/;
const chapters = [];
let currentChapter = { title: '第一回', content: [] };
paragraphs.forEach(p => {
  if (chapterRegex.test(p)) {
    if (currentChapter.content.length > 0) chapters.push(currentChapter);
    currentChapter = { title: p, content: [] };
  } else {
    currentChapter.content.push(p);
  }
});
chapters.push(currentChapter);

// 生成最终JSON（每条含回目、段落、长度）
const typingMaterials = chapters.flatMap(chapter => 
  chapter.content.map(p => ({
    id: Math.random().toString(36).substr(2, 9), // 唯一标识
    chapter: chapter.title,
    text: p,
    length: p.length
  }))
);

// 写入文件
fs.writeFileSync(
  path.join(__dirname, 'xiyouji-typing.json'),
  JSON.stringify(typingMaterials, null, 2),
  'utf8'
);
console.log(`生成成功！共${typingMaterials.length}条素材`);