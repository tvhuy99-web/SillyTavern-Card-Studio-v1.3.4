// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createTableLorebookLinks(dependencies = {}) {
var rl=e=>{let t=[];return e.tables.forEach(e=>{let n=e.config.lorebookLink;if(!n||!n.enabled||!n.keyColumnId)return;let r=e.config.columns.findIndex(e=>e.id===n.keyColumnId);-1!==r&&e.data.rows.forEach(n=>{let a=n[0],i=n[r+1];if(!i)return;let o=[`### [Mythic Data] ${i}`];o.push(`**Nguồn:** ${e.config.name}`),e.config.columns.forEach((e,t)=>{let r=n[t+1];null==r||""===r||o.push(`- **${e.label}:** ${r}`)});let s=o.join("\n"),l={uid:`mythic_${e.config.id}_${a}`,keys:[String(i)],secondary_keys:[],comment:`[Live-Link] ${i}`,content:s,constant:!1,selective:!0,enabled:!0,position:"before_char",use_regex:!1,insertion_order:100};t.push(l)})}),t};
return { buildLinkedLorebookEntries: rl };
}
