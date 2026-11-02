// 搜尋：在手機上直接比對，不連網。
// 規則：分類篩選 + 每個詞都要出現（取交集）+ 單字與部分比對；新的在前。

const SEPARATORS = /[\s,，、;；]+/;

// NFKC 讓全形英數變半形，再統一小寫
export function normalize(text) {
  return String(text ?? '').normalize('NFKC').toLowerCase();
}

export function splitTerms(query) {
  return normalize(query).split(SEPARATORS).filter(Boolean);
}

export function search(items, { category = '', query = '' } = {}) {
  const terms = splitTerms(query);
  return items
    .filter((item) => !category || item.category === category)
    .filter((item) => {
      if (!terms.length) return true;
      const haystack = normalize(`${item.category} ${item.keywords}`);
      return terms.every((term) => haystack.includes(term));
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
