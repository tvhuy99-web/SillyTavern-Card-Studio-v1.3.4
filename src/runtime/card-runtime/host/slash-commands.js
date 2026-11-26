// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createSlashCommands(dependencies = {}) {
  var tp = e => {
    let t = [];
    let n = "";
    let r = false;
    let a = "";
    for (let i = 0; i < e.length; i++) {
      let o = e[i];
      if ('"' !== o && "'" !== o || r) {
        if (o === a && r) {
          r = false;
          a = "";
        } else {
          if (" " !== o || r) {
            n += o;
          } else {
            n.length > 0 && (t.push(n), n = "");
          }
        }
      } else {
        r = true;
        a = o;
      }
    }
    n.length > 0 && t.push(n);
    return t;
  };
  var np = e => {
    let t = {};
    let n = [];
    e.forEach(e => {
      let r = e.match(/^([a-zA-Z_][\w-]*)=(.*)$/s);
      if (r) {
        t[r[1].toLowerCase()] = r[2];
      } else {
        n.push(e);
      }
    });
    return {
      named: t,
      positional: n
    };
  };
  var rp = e => {
    let t = String(e ?? "").trim();
    if ("true" === t) return true;
    if ("false" === t) return false;
    if ("null" === t) return null;
    if ("" !== t && Number.isFinite(Number(t))) return Number(t);
    if (t.startsWith("{") && t.endsWith("}") || t.startsWith("[") && t.endsWith("]")) try {
      return JSON.parse(t);
    } catch {}
    return e;
  };
  var ap = e => {
    let {
      named: t,
      positional: n
    } = np(e);
    return {
      key: t.key ?? t.name ?? n.shift() ?? "",
      value: rp(t.value ?? n.join(" "))
    };
  };
  var ip = (e, t) => {
    let n = (0, dependencies.Xu)(e);
    n = n.replace(/{{random:(.*?)}}/gi, (e, t) => {
      let n = t.split(",");
      if (2 === n.length && !isNaN(Number(n[0])) && !isNaN(Number(n[1]))) {
        let e = Number(n[0]);
        let t = Number(n[1]);
        return String(Math.floor(Math.random() * (t - e + 1)) + e);
      }
      return n.length >= 1 ? n[Math.floor(Math.random() * n.length)].trim() : "";
    });
    n = n.replace(/{{pick:(.*?)}}/gi, (e, t) => {
      let n = t.split(",").map(e => e.trim());
      return n.length > 0 ? n[Math.floor(Math.random() * n.length)] : "";
    });
    let r = (e, t, n, r) => {
      let a = Math.max(1, Math.min(100, t ? parseInt(t, 10) : 1));
      let i = Math.max(1, Math.min(1e6, parseInt(n, 10)));
      let o = 0;
      for (let e = 0; e < a; e++) o += Math.floor(Math.random() * i) + 1;
      if (r) {
        let e = r.replace(/\s/g, "");
        o += parseInt(e, 10);
      }
      return String(o);
    };
    n = n.replace(/{{dice:(\s*\d*)d(\d+)\s*([+-]\s*\d+)?\s*}}/gi, r);
    n = n.replace(/{{roll:(\s*\d*)d(\d+)\s*([+-]\s*\d+)?\s*}}/gi, r);
    n = n.replace(/{{char}}/gi, t.characterName);
    n = n.replace(/{{user}}/gi, t.userPersonaName);
    let a = new Date();
    n = n.replace(/{{time}}/gi, a.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    }));
    n = n.replace(/{{date}}/gi, a.toLocaleDateString());
    n = n.replace(/{{getvar::([^}]+)}}/gi, (e, n) => {
      let r = (0, dependencies.Uu)(t.variables, n);
      return undefined === r ? "" : String(r);
    });
    n = n.replace(/{{getglobalvar::([^}]+)}}/gi, (e, n) => {
      let r = (0, dependencies.Uu)(t.variables, "globals." + n);
      return undefined === r ? "" : String(r);
    });
    n = n.replace(/{{setglobalvar::([^:]+)::(.*?)}}/gi, (e, n, r) => {
      let a = (0, dependencies.Gu)(t.variables, "set", "globals." + n, r);
      t.variables = a;
      t.setVariables(a);
      return "";
    });
    n = n.replace(/{{setvar::([^:]+)::(.*?)}}/gi, (e, n, r) => {
      let a = (0, dependencies.Gu)(t.variables, "set", n, r);
      t.variables = a;
      t.setVariables(a);
      return "";
    });
    n = n.replace(/{{\s*([a-zA-Z0-9_.[\]]+)\s*}}/g, (e, n) => {
      if (n.includes(":")) return e;
      let r = (0, dependencies.Uu)(t.variables, n);
      return undefined === r ? e : String(r);
    });
    return n;
  };
  var op = (e, t, n) => {
    let r = Number(e);
    let a = Number(n);
    let i = !isNaN(r) && !isNaN(a);
    let o = i ? r : e;
    let s = i ? a : n;
    switch (t) {
      case "==":
      case "eq":
        return o == s;
      case "===":
        return o === s;
      case "!=":
      case "neq":
        return o != s;
      case "!==":
        return o !== s;
      case ">":
      case "gt":
        return o > s;
      case ">=":
      case "gte":
        return o >= s;
      case "<":
      case "lt":
        return o < s;
      case "<=":
      case "lte":
        return o <= s;
      case "includes":
        return String(e).includes(String(n));
      case "!includes":
        return !String(e).includes(String(n));
      default:
        return false;
    }
  };
  var sp = {
    echo: async (e, t, n) => t.sendMessage(n, "system"),
    send: async (e, t, n) => t.sendMessage(n, "user"),
    sys: async (e, t, n) => t.sendMessage(n, "system"),
    as: async (e, t, n) => {
      if (e.length >= 2) {
        let r = e[0];
        let a = n.indexOf(r) + r.length;
        let i = n.substring(a).trim();
        i.startsWith('"') && i.endsWith('"') && (i = i.slice(1, -1));
        t.sendMessage(`${r}: ${i}`, "system");
      }
    },
    set: async (e, t) => {
      let n = e[0];
      let r = e[1];
      if (n && n.includes("=") && !r) {
        let e = n.split("=");
        n = e[0];
        r = e.slice(1).join("=");
      }
      if (n && undefined !== r) {
        let e = (0, dependencies.Gu)(t.variables, "set", n, r);
        t.variables = e;
        t.setVariables(e);
      }
    },
    var: async (e, t, n, r) => sp.set(e, t, n, r),
    setvar: async (e, t) => {
      let {
        key: n,
        value: r
      } = ap(e);
      if (!n) return "";
      let a = (0, dependencies.Gu)(t.variables, "set", n, r);
      t.variables = a;
      t.setVariables(a);
      return String(r ?? "");
    },
    get: async (e, t) => {
      let n = (0, dependencies.Uu)(t.variables, e[0]);
      t.sendMessage(`[System] ${e[0]} = ${n}`, "system");
      return null == n ? "" : String(n);
    },
    getvar: async (e, t) => {
      let {
        named: n,
        positional: r
      } = np(e);
      let a = (0, dependencies.Uu)(t.variables, n.key ?? r[0]);
      return null == a ? "" : "object" == typeof a ? JSON.stringify(a) : String(a);
    },
    add: async (e, t) => {
      let n = (0, dependencies.Gu)(t.variables, "add", e[0], e[1]);
      t.variables = n;
      t.setVariables(n);
    },
    sub: async (e, t) => {
      let n = (0, dependencies.Gu)(t.variables, "sub", e[0], e[1]);
      t.variables = n;
      t.setVariables(n);
    },
    mul: async (e, t) => {
      let n = (0, dependencies.Gu)(t.variables, "mul", e[0], e[1]);
      t.variables = n;
      t.setVariables(n);
    },
    div: async (e, t) => {
      let n = (0, dependencies.Gu)(t.variables, "div", e[0], e[1]);
      t.variables = n;
      t.setVariables(n);
    },
    setglobalvar: async (e, t) => {
      let n = ap(e);
      let r = "globals." + n.key;
      let a = n.value;
      if (n.key && undefined !== a) {
        let e = (0, dependencies.Gu)(t.variables, "set", r, a);
        t.variables = e;
        t.setVariables(e);
      }
      return String(a ?? "");
    },
    getglobalvar: async (e, t) => {
      let {
        named: n,
        positional: r
      } = np(e);
      let a = (0, dependencies.Uu)(t.variables, "globals." + (n.key ?? r[0] ?? ""));
      return null == a ? "" : "object" == typeof a ? JSON.stringify(a) : String(a);
    },
    addvar: async (e, t) => {
      let {
        key: n,
        value: r
      } = ap(e);
      let a = (0, dependencies.Gu)(t.variables, "add", n, r);
      t.variables = a;
      t.setVariables(a);
      let i = (0, dependencies.Uu)(a, n);
      return null == i ? "" : String(i);
    },
    incvar: async (e, t) => {
      let {
        named: n,
        positional: r
      } = np(e);
      let a = n.key ?? r[0] ?? "";
      let i = rp(n.value ?? r[1] ?? "1");
      let o = (0, dependencies.Gu)(t.variables, "add", a, i);
      t.variables = o;
      t.setVariables(o);
      return String((0, dependencies.Uu)(o, a) ?? "");
    },
    decvar: async (e, t) => {
      let {
        named: n,
        positional: r
      } = np(e);
      let a = n.key ?? r[0] ?? "";
      let i = rp(n.value ?? r[1] ?? "1");
      let o = (0, dependencies.Gu)(t.variables, "sub", a, i);
      t.variables = o;
      t.setVariables(o);
      return String((0, dependencies.Uu)(o, a) ?? "");
    },
    delvar: async (e, t) => {
      let {
        named: n,
        positional: r
      } = np(e);
      let a = n.key ?? r[0] ?? "";
      let i = (0, dependencies.Gu)(t.variables, "delete", a, undefined);
      t.variables = i;
      t.setVariables(i);
      return "";
    },
    flushvar: async (e, t, n, r) => sp.delvar(e, t, n, r),
    length: async (e, t) => {
      let n = e[0];
      let r = (0, dependencies.Uu)(t.variables, e[1]);
      let a = 0;
      (Array.isArray(r) || "string" == typeof r) && (a = r.length);
      let i = (0, dependencies.Gu)(t.variables, "set", n, a);
      t.variables = i;
      t.setVariables(i);
    },
    concat: async (e, t) => {
      let n = e[0];
      let r = "";
      for (let t = 1; t < e.length; t++) r += String(e[t]);
      let a = (0, dependencies.Gu)(t.variables, "set", n, r);
      t.variables = a;
      t.setVariables(a);
    },
    jump: async (e, t, n, r) => {
      let a = e[0];
      if (undefined === r.labels[a]) {
        t.log("warn", `Label not found: ${a}`);
      } else {
        r.pc = r.labels[a];
      }
    },
    goto: async (e, t, n, r) => sp.jump(e, t, n, r),
    go: async (e, t, n, r) => sp.jump(e, t, n, r),
    wait: async (e, t) => {
      let n = Math.min(6e4, Math.max(0, parseInt(e[0], 10)));
      isNaN(n) || (await new Promise(e => setTimeout(e, n)));
    },
    delay: async (e, t, n, r) => sp.wait(e, t, n, r),
    lock: async (e, t) => {
      t.setIsInputLocked && t.setIsInputLocked(true);
    },
    unlock: async (e, t) => {
      t.setIsInputLocked && t.setIsInputLocked(false);
    },
    input: async (e, t, n) => {
      let r = e[0] || n;
      window.dispatchEvent(new CustomEvent("sillytavern:set-input", {
        detail: r
      }));
    },
    qr: async (e, t, n) => {
      if (t.setQuickReplies) {
        let e = n.split("|").map(e => e.trim()).filter(Boolean).map(e => ({
          label: e,
          message: e
        }));
        t.setQuickReplies(e);
      }
    },
    buttons: async (e, t, n) => {
      if (t.setQuickReplies) {
        let e = n.split("|").map(e => {
          let t = e.trim().match(/^"([^"]+)"\s*(.*)$/);
          if (t) return {
            label: t[1],
            action: t[2] || t[1]
          };
          let n = e.trim().split(/\s+(.+)/);
          return {
            label: n[0],
            action: n[1] || n[0]
          };
        });
        t.setQuickReplies(e);
      }
    },
    toast: async (e, t, n) => {
      let r = e[0] || n;
      let a = e[1] || "info";
      t.showToast && t.showToast(r, a);
    },
    popup: async (e, t, n) => {
      let r = e[0] || n;
      t.showPopup && t.showPopup(r);
    },
    bg: async (e, t, n) => {
      let r = e[0] || n;
      t.setVisualState && t.setVisualState("bg", r);
    },
    music: async (e, t, n) => {
      let r = e[0] || n;
      t.setVisualState && t.setVisualState("music", r);
    },
    sound: async (e, t, n) => {
      let r = e[0] || n;
      t.setVisualState && t.setVisualState("sound", r);
    },
    label: async () => {},
    comment: async () => "",
    pass: async (e, t, n) => n,
    stop: async () => false
  };
  return {
    tp,
    ip,
    op,
    sp
  };
}