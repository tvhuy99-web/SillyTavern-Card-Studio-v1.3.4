// RPG actions share the store's existing Immer transaction and derived Lorebook builder.
export function createSessionRpgActions(setState, dependencies) {
    function synchronize(draft, operation) {
        draft.card.rpg_data.lastUpdated = Date.now();
        try { draft.generatedLorebookEntries = dependencies.buildLinkedLorebookEntries(draft.card.rpg_data); }
        catch (error) { console.error(`Sync error in ${operation}`, error); }
    }
    return {
        updateRpgCell: (tableId, rowIndex, columnIndex, value) => setState(draft => {
            const table = draft.card?.rpg_data?.tables.find(table => table.config.id === tableId);
            if (table && table.data.rows[rowIndex]) {
                table.data.rows[rowIndex][columnIndex + 1] = value;
                synchronize(draft, 'updateRpgCell');
            }
        }),
        addRpgRow: tableId => setState(draft => {
            const table = draft.card?.rpg_data?.tables.find(table => table.config.id === tableId);
            if (!table) return;
            const id = `row_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            const row = Array(table.config.columns.length + 1).fill('');
            row[0] = id;
            table.data.rows.push(row);
            synchronize(draft, 'addRpgRow');
        }),
        deleteRpgRow: (tableId, rowIndex) => setState(draft => {
            const table = draft.card?.rpg_data?.tables.find(table => table.config.id === tableId);
            if (!table) return;
            table.data.rows.splice(rowIndex, 1);
            synchronize(draft, 'deleteRpgRow');
        }),
        replaceRpgTableRows: (tableId, rows) => setState(draft => {
            const table = draft.card?.rpg_data?.tables.find(table => table.config.id === tableId);
            if (!table) return;
            table.data.rows = rows;
            synchronize(draft, 'replaceRpgTableRows');
        }),
        reloadRpgConfig: config => setState(draft => {
            if (!draft.card) return;
            const updated = JSON.parse(JSON.stringify(config));
            const previous = draft.card.rpg_data;
            if (previous) updated.tables.forEach(table => {
                const oldTable = previous.tables.find(old => old.config.id === table.config.id);
                table.data.rows = oldTable ? oldTable.data.rows : [];
            });
            draft.card.rpg_data = updated;
            updated.lastUpdated = Date.now();
            try {
                const entries = dependencies.buildLinkedLorebookEntries(updated);
                draft.generatedLorebookEntries = entries;
                draft.logs = dependencies.__stsDiagnosticsState.addSystem({
                    level: 'state', source: 'system',
                    message: `[RPG Config Reload] Đã đồng bộ cấu trúc từ thẻ gốc. Dữ liệu hàng được giữ nguyên. Đã tạo ${entries.length} mục Live-Link.`,
                    timestamp: Date.now()
                });
            } catch (error) { console.error('Sync error in reloadRpgConfig', error); }
        })
    };
}
