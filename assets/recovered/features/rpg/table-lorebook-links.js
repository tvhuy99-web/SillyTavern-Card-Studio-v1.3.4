export function createTableLorebookLinks(dependencies = {}) {
var buildLinkedLorebookEntries = database => {
  let entries = [];
  database.tables.forEach(table => {
    let link = table.config.lorebookLink;
    if (!link || !link.enabled || !link.keyColumnId) return;
    let keyColumnIndex = table.config.columns.findIndex(column => column.id === link.keyColumnId);
    if (keyColumnIndex === -1) return;
    table.data.rows.forEach(row => {
      let rowId = row[0], keyValue = row[keyColumnIndex + 1];
      if (!keyValue) return;
      let lines = [`### [Mythic Data] ${keyValue}`];
      lines.push(`**Nguồn:** ${table.config.name}`);
      table.config.columns.forEach((column, columnIndex) => {
        let cellValue = row[columnIndex + 1];
        if (cellValue != null && cellValue !== "") lines.push(`- **${column.label}:** ${cellValue}`);
      });
      let content = lines.join("\n");
      let entry = {
        uid: `mythic_${table.config.id}_${rowId}`, keys: [String(keyValue)], secondary_keys: [],
        comment: `[Live-Link] ${keyValue}`, content: content, constant: false, selective: true,
        enabled: true, position: "before_char", use_regex: false, insertion_order: 100
      };
      entries.push(entry);
    });
  });
  return entries;
};
return { buildLinkedLorebookEntries };
}
