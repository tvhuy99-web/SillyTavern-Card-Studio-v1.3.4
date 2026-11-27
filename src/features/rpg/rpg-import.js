export function createRpgImport(dependencies = {}) {
var rpgPromptMacros=[{label:"{{rpg_schema}}",desc:"Cấu trúc bảng & cột"},{label:"{{rpg_data}}",desc:"Dữ liệu hiện tại (JSON/Table)"},{label:"{{global_rules}}",desc:"Luật chơi chung"},{label:"{{chat_history}}",desc:"Lịch sử hội thoại gần nhất"},{label:"{{rpg_lorebook}}",desc:"Dữ liệu Sổ tay (Hybrid)"}];
var importChatSheetsDatabase = source => {
  let tables = [];
  let sheetKeys = Object.keys(source).filter(key => (key.startsWith("sheet_") || source[key]?.content && Array.isArray(source[key].content)) && "object" == typeof source[key]);
  if (sheetKeys.length === 0) throw Error("Không tìm thấy dữ liệu bảng hợp lệ (ChatSheets format).");
  for (let sheetKey of sheetKeys) {
    let sheet = source[sheetKey], content = sheet.content || [];
    if (content.length === 0) continue;
    let columns = content[0].slice(1).map((label, columnIndex) => ({
      id: String(columnIndex), label: label || `Column ${columnIndex + 1}`, type: "string"
    }));
    let rows = content.slice(1).map(row => {
      let copiedRow = [...row];
      copiedRow[0] = `row_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
      return copiedRow;
    });
    let sourceData = sheet.sourceData || {};
    let aiRules = {init: sourceData.initNode, update: sourceData.updateNode, insert: sourceData.insertNode, delete: sourceData.deleteNode};
    let exportConfig = sheet.exportConfig || {};
    let exportSettings = {
      enabled: false !== exportConfig.enabled, format: "markdown_table",
      strategy: "keyword" === exportConfig.entryType ? "on_change" : "always",
      splitByRow: exportConfig.splitByRow, entryName: exportConfig.entryName || sheet.name, entryType: exportConfig.entryType,
      keywords: exportConfig.keywords, preventRecursion: exportConfig.preventRecursion, injectIntoWorldbook: exportConfig.injectIntoWorldbook
    };
    tables.push({config: {id: sheet.uid || sheetKey, name: sheet.name || sheetKey, description: sourceData.note, columns: columns, export: exportSettings, aiRules: aiRules, orderNo: sheet.orderNo}, data: {rows: rows}});
  }
  tables.sort((first, second) => (first.config.orderNo || 0) - (second.config.orderNo || 0));
  return {version: 2, tables: tables, globalRules: "Hệ thống RPG Tự động.", lastUpdated: Date.now()};
};
return { rpgPromptMacros, importChatSheetsDatabase };
}
