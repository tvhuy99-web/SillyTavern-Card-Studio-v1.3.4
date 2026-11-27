function getProposalAccentClass(toolName) {
  switch (toolName) {
    case 'add_prompt':
      return 'text-green-400';
    case 'move_prompt':
      return 'text-blue-400';
    case 'toggle_prompt':
      return 'text-amber-400';
    case 'edit_prompt':
      return 'text-fuchsia-400';
    case 'update_variable':
      return 'text-rose-400';
    case 'rewrite_last_turn':
      return 'text-cyan-400';
    default:
      return 'text-indigo-300';
  }
}

function getProposalDisplayTitle(toolName) {
  switch (toolName) {
    case 'add_prompt':
      return 'Thêm Lời Nhắc Mới';
    case 'move_prompt':
      return 'Di Chuyển Lời Nhắc';
    case 'toggle_prompt':
      return 'Bật/Tắt Lời Nhắc';
    case 'edit_prompt':
      return 'Chỉnh Sửa Nội Dung';
    case 'update_author_note':
      return 'Sửa Ghi Chú Tác Giả';
    case 'add_lore':
      return 'Thêm World Info';
    case 'update_variable':
      return 'Cập Nhật Biến Số';
    case 'rewrite_last_turn':
      return 'Viết Lại Phản Hồi';
    default:
      return 'Hành Động';
  }
}

export function createActionProposal(getDependencies) {
  return function ActionProposal({ proposal, onExecute }) {
    const { react, Icon, jsxRuntime } = getDependencies();
    const [targetScope, setTargetScope] = react.useState('preset');
    const [isExecuted, setIsExecuted] = react.useState(false);

    const isDirectExecutionTool = proposal.tool === 'update_variable' || proposal.tool === 'rewrite_last_turn';

    if (isExecuted) {
      return jsxRuntime.jsxs('div', {
        className: 'mt-2 p-3 bg-green-900/30 border border-green-500/50 rounded-lg text-green-300 text-sm flex items-center gap-2',
        children: [
          jsxRuntime.jsx(Icon, { name: 'check', className: 'h-4 w-4' }),
          jsxRuntime.jsx('span', { children: 'Đã thực thi hành động thành công.' }),
        ],
      });
    }

    return jsxRuntime.jsxs('div', {
      className: 'mt-3 p-4 bg-slate-800 border border-indigo-500/50 rounded-xl shadow-lg ',
      children: [
        jsxRuntime.jsxs('div', {
          className: `flex items-center gap-2 mb-2 font-bold text-sm uppercase tracking-wide ${getProposalAccentClass(proposal.tool)}`,
          children: [
            jsxRuntime.jsx(Icon, { name: 'sparkles', className: 'h-4 w-4' }),
            'Đề xuất: ',
            getProposalDisplayTitle(proposal.tool),
          ],
        }),
        jsxRuntime.jsxs('p', {
          className: 'text-xs text-slate-400 mb-3 italic',
          children: ['"', proposal.reason, '"'],
        }),
        jsxRuntime.jsxs('div', {
          className: 'bg-slate-900/50 p-2 rounded border border-slate-700 mb-4 text-xs font-mono text-slate-300 max-h-48 overflow-y-auto custom-scrollbar',
          children: [
            proposal.tool === 'add_prompt' && jsxRuntime.jsxs(jsxRuntime.Fragment, {
              children: [
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Tên:' }),
                    ' ',
                    proposal.data.name,
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Nội dung:' }),
                    ' ',
                    proposal.data.content,
                  ],
                }),
              ],
            }),
            proposal.tool === 'update_variable' && jsxRuntime.jsxs(jsxRuntime.Fragment, {
              children: [
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Biến số:' }),
                    ' ',
                    proposal.data.key,
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Giá trị mới:' }),
                    ' ',
                    JSON.stringify(proposal.data.value),
                  ],
                }),
              ],
            }),
            proposal.tool === 'rewrite_last_turn' && jsxRuntime.jsxs(jsxRuntime.Fragment, {
              children: [
                jsxRuntime.jsx('div', { className: 'text-gray-400 mb-1', children: 'Nội dung viết lại:' }),
                jsxRuntime.jsx('div', {
                  className: 'pl-2 border-l-2 border-cyan-500/50',
                  children: proposal.data.content,
                }),
              ],
            }),
            proposal.tool === 'move_prompt' && jsxRuntime.jsxs(jsxRuntime.Fragment, {
              children: [
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Mục tiêu:' }),
                    ' ',
                    proposal.data.name,
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Đến vị trí:' }),
                    ' ',
                    proposal.data.position === 'top'
                      ? 'Đầu danh sách'
                      : (proposal.data.position === 'bottom' ? 'Cuối danh sách' : `Vị trí #${proposal.data.position}`),
                  ],
                }),
              ],
            }),
            proposal.tool === 'toggle_prompt' && jsxRuntime.jsxs(jsxRuntime.Fragment, {
              children: [
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Mục tiêu:' }),
                    ' ',
                    proposal.data.name,
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Trạng thái mới:' }),
                    ' ',
                    proposal.data.enabled ? 'BẬT (Enabled)' : 'TẮT (Disabled)',
                  ],
                }),
              ],
            }),
            proposal.tool === 'edit_prompt' && jsxRuntime.jsxs(jsxRuntime.Fragment, {
              children: [
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Mục tiêu:' }),
                    ' ',
                    proposal.data.name,
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  className: 'mt-1 border-t border-slate-700 pt-1 text-green-300',
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Nội dung mới:' }),
                    ' ',
                    proposal.data.content,
                  ],
                }),
              ],
            }),
            proposal.tool === 'update_author_note' && jsxRuntime.jsxs('div', {
              children: [
                jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Nội dung mới:' }),
                ' ',
                proposal.data.content,
              ],
            }),
            proposal.tool === 'add_lore' && jsxRuntime.jsxs(jsxRuntime.Fragment, {
              children: [
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Keys:' }),
                    ' ',
                    proposal.data.keys?.join(', '),
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Content:' }),
                    ' ',
                    proposal.data.content,
                  ],
                }),
              ],
            }),
          ],
        }),
        jsxRuntime.jsxs('div', {
          className: 'space-y-3',
          children: [
            !isDirectExecutionTool && jsxRuntime.jsxs('div', {
              className: 'flex flex-col gap-1',
              children: [
                jsxRuntime.jsx('span', {
                  className: 'text-xs font-semibold text-slate-300',
                  children: 'Lưu thay đổi vào đâu?',
                }),
                jsxRuntime.jsxs('div', {
                  className: 'flex bg-slate-900 rounded-lg p-1 border border-slate-700',
                  children: [
                    jsxRuntime.jsx('button', {
                      onClick: () => setTargetScope('preset'),
                      className: `flex-1 py-1.5 px-3 rounded-md text-xs font-medium  ${
                        targetScope === 'preset' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                      }`,
                      children: 'Preset (Toàn cục)',
                    }),
                    jsxRuntime.jsx('button', {
                      onClick: () => setTargetScope('character'),
                      className: `flex-1 py-1.5 px-3 rounded-md text-xs font-medium  ${
                        targetScope === 'character' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                      }`,
                      children: 'Nhân vật (Cục bộ)',
                    }),
                  ],
                }),
              ],
            }),
            jsxRuntime.jsxs('button', {
              onClick: () => {
                onExecute(targetScope);
                setIsExecuted(true);
              },
              className: 'w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg shadow-md  active:scale-95 text-sm flex items-center justify-center gap-2',
              children: [
                ' ',
                isDirectExecutionTool ? 'Thực thi Ngay' : 'Áp dụng Thay đổi',
              ],
            }),
          ],
        }),
      ],
    });
  };
}
