// Recovered from the application host. One owner; dependency getters preserve late binding.

const DEFAULT_MYTHIC_SYSTEM_PROMPT = [
  '',
  'Bạn là một Medusa chuyên điền bảng biểu. Bạn cần tham khảo bối cảnh thiết lập trước đó cũng như <Dữ liệu chính văn> được gửi cho bạn để ghi lại dưới dạng bảng. ',
  '',
  'Bạn cần:',
  '1. Đọc <Dữ liệu bảng (Hybrid)> để hiểu cấu trúc và trạng thái hiện tại.',
  '2. Tham khảo <Dữ liệu tham khảo> (nếu có) để hiểu các quy tắc thế giới, vật phẩm và chỉ số.',
  '3. Thực hiện sửa đổi (Thêm/Sửa/Xóa) để phản ánh diễn biến mới nhất.',
  '',
  'Đầu ra cuối cùng của bạn phải là định dạng văn bản thuần túy, tuân thủ nghiêm ngặt thứ tự <tableThink>, <tableCheck>, <tableEdit>. Bắt đầu trực tiếp bằng thẻ <tableThink> và kết thúc bằng thẻ </tableEdit>. Hướng dẫn điền cụ thể như sau:',
  '',
  '## 《Hướng dẫn điền bảng dữ liệu》',
  '',
  '<tableThink> (Khối suy nghĩ về bảng):',
  'Chức năng: Chứa nội dung phân tích của AI, quá trình suy nghĩ để quyết định thao tác bảng. Mọi nội dung suy nghĩ phải được bao gồm hoàn toàn trong khối chú thích <!-- và -->.',
  '',
  'Tóm tắt cốt truyện: Trước tiên, phải viết một bản tóm tắt cốt truyện hoàn chỉnh dựa trên dữ liệu chính văn do người dùng cung cấp. Lưu ý đặc biệt là người dùng có thể gửi nhiều lượt đối thoại, tóm tắt phải bao quát tất cả cốt truyện chính văn.',
  '',
  'Nội dung tóm tắt: Mô tả đơn giản và đầy đủ toàn bộ cốt truyện diễn ra trong chính văn, bao gồm các thông tin có sự thay đổi.',
  '',
  'Nắm bắt thay đổi: Tập trung vào trôi qua của thời gian, chuyển dịch địa điểm, thay đổi trạng thái/trải nghiệm/quan hệ của nhân vật, thu thập/tiêu hao vật phẩm, cập nhật tiến độ nhiệm vụ, v.v.',
  '',
  'Ánh xạ chỉ mục bảng (Bước then chốt):',
  '- Đọc kỹ phần <Dữ liệu bảng (Hybrid)>. Mỗi bảng bắt đầu bằng [[DB_TABLE_Index]].',
  '- Bạn phải trích xuất con số Index này làm tableIndex cho các lệnh.',
  '- Ví dụ: Nếu tiêu đề là [[DB_TABLE_4]] Túi đồ -> tableIndex là 4.',
  '',
  'Quyết định thao tác: Sau khi hoàn thành tóm tắt, dựa vào các quy tắc [Luật] trong bảng, phân tích xem cần thực hiện insertRow, updateRow hay deleteRow.',
  '',
  '<tableCheck> (Khối kiểm tra các mục quan trọng):',
  'Chức năng: Sau khi suy nghĩ chính, trước khi thực hiện lệnh, tiến hành kiểm tra cuối cùng các nhiệm vụ quan trọng. Mọi nội dung kiểm tra phải được bao gồm hoàn toàn trong khối chú thích <!-- và -->.',
  '',
  'Xác nhận khởi tạo: Kiểm tra dữ liệu hiện tại trong mảng DATA xem có trống không. Nếu trống và luật cho phép, hãy khởi tạo.',
  'Xác nhận chỉ mục: Kiểm tra lại xem tableIndex có khớp với tiêu đề [[DB_TABLE_X]] không.',
  'Tính nhất quán: Đảm bảo dữ liệu logic với câu chuyện (ví dụ: HP không được âm trừ khi chết).',
  '',
  '<tableEdit> (Khối lệnh chỉnh sửa bảng):',
  'Chức năng: Chứa các lệnh thao tác thực tế để cập nhật dữ liệu bảng (insertRow, updateRow, deleteRow). Mọi lệnh phải được bao gồm hoàn toàn trong khối chú thích <!-- và -->.',
  '',
  'Cú pháp lệnh <tableEdit> (Tuân thủ nghiêm ngặt):',
  '',
  'Loại thao tác: Chỉ giới hạn deleteRow, insertRow, updateRow.',
  '',
  'Định dạng tham số:',
  'tableIndex (Số thứ tự bảng): Lấy từ [[DB_TABLE_Index]].',
  'rowIndex (Số thứ tự hàng): Là chỉ số của mảng trong khối DATA (bắt đầu từ 0).',
  'colIndex (Số thứ tự cột): Là chuỗi ký tự chỉ số cột ("0", "1", "2"...) tương ứng với phần SCHEMA.',
  '',
  'Ví dụ lệnh:',
  'Chèn: insertRow(4, {"1": "Kiếm gỗ", "2": 1}) (Chèn vào bảng 4, Cột 1 là Kiếm gỗ, Cột 2 là 1)',
  'Cập nhật: updateRow(4, 0, {"2": 5}) (Cập nhật bảng 4, hàng 0, cột 2 thành 5)',
  'Xóa: deleteRow(4, 0) (Xóa hàng 0 của bảng 4)',
  '',
  '-- CONTEXT --',
  '<Dữ liệu bảng (Hybrid)>',
  '{{rpg_hybrid_table}}',
  '</Dữ liệu bảng (Hybrid)>',
  '',
  '<Dữ liệu tham khảo (Lorebook)>',
  '{{rpg_lorebook}}',
  '</Dữ liệu tham khảo (Lorebook)>',
  '',
  '<Dữ liệu chính văn>',
  '{{chat_history}}',
  '</Dữ liệu chính văn>',
  '',
  'LUẬT CHUNG:',
  '{{global_rules}}',
  '',
].join('\n');

function formatRpgHybridTable(rpgDatabase) {
  let output = '';
  rpgDatabase.tables.forEach((table, tableIndex) => {
    const { config, data } = table;
    output += `[[DB_TABLE_${tableIndex}]] ${config.name}\n`;
    if (config.description) {
      output += `> MÔ TẢ: ${config.description}\n`;
    }

    const rules = [];
    if (config.aiRules?.init) rules.push(`[Init: ${config.aiRules.init}]`);
    if (config.aiRules?.insert) rules.push(`[Insert: ${config.aiRules.insert}]`);
    if (config.aiRules?.update) rules.push(`[Update: ${config.aiRules.update}]`);
    if (config.aiRules?.delete) rules.push(`[Delete: ${config.aiRules.delete}]`);
    if (rules.length > 0) {
      output += `> LUẬT: ${rules.join(' ')}\n`;
    }

    output += '> SCHEMA (Cấu trúc cột):\n';
    config.columns.forEach((column, colIndex) => {
      output += `  ["${colIndex}"] ${column.label} (${column.type})\n`;
    });

    output += '> DATA (Mảng dữ liệu):\n';
    if (data.rows && data.rows.length !== 0) {
      output += '[\n';
      const formattedRows = data.rows.map(row => `  ${JSON.stringify(row.slice(1))}`);
      output += formattedRows.join(',\n');
      output += '\n]\n';
    } else {
      output += '  (Trống - Cần khởi tạo)\n';
    }
    output += '\n';
  });
  return output;
}

function createRpgRowSnapshot(rpgDatabase) {
  const snapshot = [];
  rpgDatabase.tables.forEach(table => {
    const rowIds = [];
    if (table.data.rows) {
      table.data.rows.forEach(row => {
        if (row.length > 0) {
          rowIds.push(row[0]);
        }
      });
    }
    snapshot.push(rowIds);
  });
  return snapshot;
}

function formatRpgSchemas(rpgDatabase) {
  let output = '';
  rpgDatabase.tables.forEach((table, tableIndex) => {
    const { config } = table;
    output += `### [${tableIndex}:${config.name}]\n`;
    output += `  DESC: ${config.description || 'N/A'}\n`;
    if (config.aiRules) {
      if (config.aiRules.init) output += `  [Điều kiện Khởi tạo]: ${config.aiRules.init}\n`;
      if (config.aiRules.update) output += `  [Điều kiện Cập nhật]: ${config.aiRules.update}\n`;
      if (config.aiRules.insert) output += `  [Điều kiện Thêm mới]: ${config.aiRules.insert}\n`;
      if (config.aiRules.delete) output += `  [Điều kiện Xóa]: ${config.aiRules.delete}\n`;
    }
    const schemaColumns = config.columns
      .map((column, colIndex) => `["${colIndex}"] ${column.label} (${column.type})`)
      .join(', ');
    output += `  [Mô tả cột (Schema)]: ${schemaColumns}\n\n`;
  });
  return output;
}

function formatRpgRows(rpgDatabase) {
  let output = '';
  rpgDatabase.tables.forEach((table, tableIndex) => {
    const { config, data } = table;
    output += `### [${tableIndex}:${config.name}]\n`;
    output += '  DATA (Rows):\n';
    if (data.rows && data.rows.length !== 0) {
      data.rows.forEach((row, rowIndex) => {
        const formattedCells = row
          .slice(1)
          .map((cell, colIndex) => `"${colIndex}":${JSON.stringify(cell)}`)
          .join(', ');
        output += `    Row ${rowIndex}: { ${formattedCells} }\n`;
      });
    } else {
      output += '    (Trống - Cần khởi tạo)\n';
    }
    output += '\n';
  });
  return output;
}

function buildMythicPrompt(template, rpgDatabase, chatHistory, lorebookText) {
  const schemaText = formatRpgSchemas(rpgDatabase);
  const dataText = formatRpgRows(rpgDatabase);
  const hybridTableText = formatRpgHybridTable(rpgDatabase);
  const globalRules = rpgDatabase.globalRules || '';
  const lastUserMatch = chatHistory.match(/User: (.*)$/m);
  const lastUserInput = lastUserMatch ? lastUserMatch[1] : '';

  return template
    .replace('{{rpg_schema}}', schemaText)
    .replace('{{rpg_data}}', dataText)
    .replace('{{rpg_hybrid_table}}', hybridTableText)
    .replace('{{rpg_lorebook}}', lorebookText)
    .replace('{{global_rules}}', globalRules)
    .replace('{{chat_history}}', chatHistory)
    .replace('{{last_user_input}}', lastUserInput);
}

function filterRpgDatabaseByActiveEntries(rpgDatabase, activeEntries) {
  const clonedDatabase = JSON.parse(JSON.stringify(rpgDatabase));
  const activeUidSet = new Set(activeEntries.map(entry => entry.uid));

  clonedDatabase.tables.forEach(table => {
    if (table.config.lorebookLink?.enabled) {
      table.data.rows = table.data.rows.filter(row => {
        const rowId = row[0];
        const mythicUid = `mythic_${table.config.id}_${rowId}`;
        return activeUidSet.has(mythicUid);
      });
    }
  });

  return clonedDatabase;
}

function extractBalancedJsonObject(sourceText, startIndex, parseJson) {
  let braceDepth = 0;
  let inString = false;
  let quoteChar = '';
  let objectStart = -1;

  for (let index = startIndex; index < sourceText.length; index += 1) {
    if (sourceText[index] === '{') {
      objectStart = index;
      break;
    }
  }
  if (objectStart === -1) {
    return null;
  }

  for (let index = objectStart; index < sourceText.length; index += 1) {
    const currentChar = sourceText[index];
    if (inString) {
      let backslashCount = 0;
      for (let lookback = index - 1; lookback >= 0 && sourceText[lookback] === '\\'; lookback -= 1) {
        backslashCount += 1;
      }
      if (currentChar === quoteChar && backslashCount % 2 === 0) {
        inString = false;
      }
    } else if (currentChar === '"' || currentChar === "'") {
      inString = true;
      quoteChar = currentChar;
    } else if (currentChar === '{') {
      braceDepth += 1;
    } else if (currentChar === '}') {
      braceDepth -= 1;
      if (braceDepth === 0) {
        const rawJson = sourceText.substring(objectStart, index + 1);
        try {
          return {
            json: parseJson(rawJson),
            endPos: index + 1,
          };
        } catch (error) {
          console.warn('Medusa JSON Parse Error:', rawJson, error);
          return null;
        }
      }
    }
  }

  return null;
}

function applyRpgActions(rpgDatabase, actions) {
  const updatedDatabase = JSON.parse(JSON.stringify(rpgDatabase));
  const notifications = [];
  const logs = [];

  actions.forEach(action => {
    try {
      if (typeof action.tableIndex !== 'number') {
        return;
      }
      const targetTable = updatedDatabase.tables[action.tableIndex];
      if (!targetTable) {
        logs.push(`[WARN] Table Index not found: ${action.tableIndex}`);
        return;
      }

      let resolvedRowIndex = action.rowIndex;
      if (action.rowId) {
        const matchedIndex = targetTable.data.rows.findIndex(row => row[0] === action.rowId);
        if (matchedIndex === -1) {
          logs.push(
            `[WARN] Row ID ${action.rowId} not found in table. Operation skipped to prevent data corruption.`,
          );
          return;
        }
        resolvedRowIndex = matchedIndex;
      }

      switch (action.type) {
        case 'UPDATE': {
          if (typeof resolvedRowIndex !== 'number' || !action.data) {
            break;
          }
          const targetRow = targetTable.data.rows[resolvedRowIndex];
          if (!targetRow) {
            logs.push(`[WARN] Row Index not found: ${action.tableIndex}:${resolvedRowIndex}`);
            break;
          }
          Object.entries(action.data).forEach(([colKey, nextValue]) => {
            if (!/^\d+$/.test(colKey)) {
              return;
            }
            const colIndex = Number.parseInt(colKey, 10);
            if (colIndex >= 0 && colIndex < targetTable.config.columns.length) {
              const previousValue = targetRow[colIndex + 1];
              targetRow[colIndex + 1] = nextValue;
              const colLabel = targetTable.config.columns[colIndex].label;
              const isTimeColumn = colLabel.toLowerCase().includes('thời gian')
                || colLabel.toLowerCase().includes('date');
              if (previousValue !== nextValue && !isTimeColumn) {
                notifications.push(`${targetTable.config.name} (${colLabel}): ${previousValue} ➝ ${nextValue}`);
              }
            }
          });
          logs.push(`UPDATE ${targetTable.config.name} (Row ${resolvedRowIndex})`);
          break;
        }
        case 'INSERT': {
          if (!action.data) {
            break;
          }
          const newRowId = `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const newRow = Array(targetTable.config.columns.length + 1).fill('');
          newRow[0] = newRowId;
          let primaryLabel = '';

          Object.entries(action.data).forEach(([colKey, cellValue]) => {
            if (!/^\d+$/.test(colKey)) {
              return;
            }
            const colIndex = Number.parseInt(colKey, 10);
            if (colIndex >= 0 && colIndex < targetTable.config.columns.length) {
              newRow[colIndex + 1] = cellValue;
              if (colIndex === 0) {
                primaryLabel = String(cellValue);
              }
            }
          });

          targetTable.data.rows.push(newRow);
          logs.push(`INSERT ${targetTable.config.name} -> ID: ${newRowId}`);
          if (primaryLabel) {
            notifications.push(`Mới: ${primaryLabel} (${targetTable.config.name})`);
          } else {
            notifications.push(`Cập nhật mới trong bảng: ${targetTable.config.name}`);
          }
          break;
        }
        case 'DELETE': {
          if (typeof resolvedRowIndex !== 'number') {
            break;
          }
          if (resolvedRowIndex >= 0 && resolvedRowIndex < targetTable.data.rows.length) {
            const removedRows = targetTable.data.rows.splice(resolvedRowIndex, 1);
            logs.push(`DELETE ${targetTable.config.name} (Row ${resolvedRowIndex})`);
            const removedLabel = removedRows[0][1];
            if (removedLabel) {
              notifications.push(`Đã xóa: ${removedLabel} (${targetTable.config.name})`);
            } else {
              notifications.push(`Đã xóa một mục khỏi: ${targetTable.config.name}`);
            }
          }
          break;
        }
        default:
          break;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logs.push(`[ERROR] Processing action ${action.type}: ${errorMessage}`);
    }
  });

  updatedDatabase.lastUpdated = Date.now();
  return {
    newDb: updatedDatabase,
    notifications,
    logs,
  };
}

export function createTableProcessing(dependencies = {}) {
  const defaultSafetySettings = [
    { category: dependencies.HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: dependencies.HarmBlockThreshold.BLOCK_NONE },
    { category: dependencies.HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: dependencies.HarmBlockThreshold.BLOCK_NONE },
    { category: dependencies.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: dependencies.HarmBlockThreshold.BLOCK_NONE },
    { category: dependencies.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: dependencies.HarmBlockThreshold.BLOCK_NONE },
  ];

  const parseRpgActions = (responseText, rowSnapshot) => {
    const actions = [];
    const blockMatch = responseText.slice(0, 2000000).match(/<tableEdit>([\s\S]*?)<\/tableEdit>/);
    if (!blockMatch) {
      return [];
    }

    let editBody = blockMatch[1];
    const nestedOpenIndex = editBody.lastIndexOf('<tableEdit>');
    if (nestedOpenIndex >= 0) {
      editBody = editBody.slice(nestedOpenIndex + 11);
    }

    editBody = editBody
      .replace(/<!--/g, '')
      .replace(/-->/g, '')
      .replace(/```[a-z]*\n?/gi, '')
      .replace(/```/g, '')
      .trim();

    const commandRe = /(insertRow|updateRow|deleteRow)\s*\(/g;
    let match;

    while (actions.length < 1000 && (match = commandRe.exec(editBody)) !== null) {
      const commandName = match[1];
      let cursor = commandRe.lastIndex;

      const readNextInteger = () => {
        const numberMatch = editBody.substring(cursor).match(/^\s*(\d+)\s*(,|(?=\)))/);
        if (!numberMatch) {
          return null;
        }
        cursor += numberMatch[0].length;
        return Number.parseInt(numberMatch[1], 10);
      };

      const tableIndex = readNextInteger();
      if (tableIndex === null) {
        continue;
      }

      const resolveRowId = (tblIndex, rowIdx) => (
        rowSnapshot && rowSnapshot[tblIndex] ? rowSnapshot[tblIndex][rowIdx] : undefined
      );

      if (commandName === 'deleteRow') {
        const rowIndex = readNextInteger();
        if (rowIndex !== null) {
          actions.push({
            type: 'DELETE',
            tableIndex,
            rowIndex,
            rowId: resolveRowId(tableIndex, rowIndex),
          });
        }
      } else if (commandName === 'insertRow') {
        const parsedObject = extractBalancedJsonObject(editBody, cursor, dependencies.parseRelaxedJson);
        if (parsedObject) {
          actions.push({
            type: 'INSERT',
            tableIndex,
            data: parsedObject.json,
          });
          cursor = parsedObject.endPos;
        }
      } else if (commandName === 'updateRow') {
        const rowIndex = readNextInteger();
        if (rowIndex !== null) {
          const parsedObject = extractBalancedJsonObject(editBody, cursor, dependencies.parseRelaxedJson);
          if (parsedObject) {
            actions.push({
              type: 'UPDATE',
              tableIndex,
              rowIndex,
              data: parsedObject.json,
              rowId: resolveRowId(tableIndex, rowIndex),
            });
            cursor = parsedObject.endPos;
          }
        }
      }
    }

    return actions;
  };

  return {
    defaultMythicSystemPrompt: DEFAULT_MYTHIC_SYSTEM_PROMPT,
    defaultMythicSafetySettings: defaultSafetySettings,
    formatRpgHybridTable,
    createRpgRowSnapshot,
    buildMythicPrompt,
    filterRpgDatabaseByActiveEntries,
    parseRpgActions,
    applyRpgActions,
  };
}
