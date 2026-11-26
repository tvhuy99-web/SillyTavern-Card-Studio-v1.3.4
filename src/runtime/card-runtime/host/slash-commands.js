// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createSlashCommands(dependencies = {}) {
  var tokenizeSlashCommand = text => {
    let tokens = [];
    let currentToken = "";
    let insideQuote = false;
    let quoteCharacter = "";
    for (let index = 0; index < text.length; index++) {
      let character = text[index];
      if ('"' !== character && "'" !== character || insideQuote) {
        if (character === quoteCharacter && insideQuote) {
          insideQuote = false;
          quoteCharacter = "";
        } else {
          if (" " !== character || insideQuote) {
            currentToken += character;
          } else {
            currentToken.length > 0 && (tokens.push(currentToken), currentToken = "");
          }
        }
      } else {
        insideQuote = true;
        quoteCharacter = character;
      }
    }
    currentToken.length > 0 && tokens.push(currentToken);
    return tokens;
  };
  var parseSlashArguments = tokens => {
    let namedArgs = {};
    let positionalArgs = [];
    tokens.forEach(token => {
      let match = token.match(/^([a-zA-Z_][\w-]*)=(.*)$/s);
      if (match) {
        namedArgs[match[1].toLowerCase()] = match[2];
      } else {
        positionalArgs.push(token);
      }
    });
    return {
      named: namedArgs,
      positional: positionalArgs
    };
  };
  var parseSlashValue = value => {
    let text = String(value ?? "").trim();
    if ("true" === text) return true;
    if ("false" === text) return false;
    if ("null" === text) return null;
    if ("" !== text && Number.isFinite(Number(text))) return Number(text);
    if (text.startsWith("{") && text.endsWith("}") || text.startsWith("[") && text.endsWith("]")) try {
      return JSON.parse(text);
    } catch {}
    return value;
  };
  var parseVariableAssignment = tokens => {
    let {
      named: namedArgs,
      positional: positionalArgs
    } = parseSlashArguments(tokens);
    return {
      key: namedArgs.key ?? namedArgs.name ?? positionalArgs.shift() ?? "",
      value: parseSlashValue(namedArgs.value ?? positionalArgs.join(" "))
    };
  };
  var expandSlashMacros = (text, context) => {
    let expanded = (0, dependencies.Xu)(text);
    expanded = expanded.replace(/{{random:(.*?)}}/gi, (match, optionsText) => {
      let options = optionsText.split(",");
      if (2 === options.length && !isNaN(Number(options[0])) && !isNaN(Number(options[1]))) {
        let minimum = Number(options[0]);
        let maximum = Number(options[1]);
        return String(Math.floor(Math.random() * (maximum - minimum + 1)) + minimum);
      }
      return options.length >= 1 ? options[Math.floor(Math.random() * options.length)].trim() : "";
    });
    expanded = expanded.replace(/{{pick:(.*?)}}/gi, (match, optionsText) => {
      let options = optionsText.split(",").map(option => option.trim());
      return options.length > 0 ? options[Math.floor(Math.random() * options.length)] : "";
    });
    let rollDice = (match, countText, sidesText, modifierText) => {
      let diceCount = Math.max(1, Math.min(100, countText ? parseInt(countText, 10) : 1));
      let sides = Math.max(1, Math.min(1e6, parseInt(sidesText, 10)));
      let total = 0;
      for (let index = 0; index < diceCount; index++) total += Math.floor(Math.random() * sides) + 1;
      if (modifierText) {
        let modifier = modifierText.replace(/\s/g, "");
        total += parseInt(modifier, 10);
      }
      return String(total);
    };
    expanded = expanded.replace(/{{dice:(\s*\d*)d(\d+)\s*([+-]\s*\d+)?\s*}}/gi, rollDice);
    expanded = expanded.replace(/{{roll:(\s*\d*)d(\d+)\s*([+-]\s*\d+)?\s*}}/gi, rollDice);
    expanded = expanded.replace(/{{char}}/gi, context.characterName);
    expanded = expanded.replace(/{{user}}/gi, context.userPersonaName);
    let now = new Date();
    expanded = expanded.replace(/{{time}}/gi, now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    }));
    expanded = expanded.replace(/{{date}}/gi, now.toLocaleDateString());
    expanded = expanded.replace(/{{getvar::([^}]+)}}/gi, (match, variablePath) => {
      let value = (0, dependencies.Uu)(context.variables, variablePath);
      return undefined === value ? "" : String(value);
    });
    expanded = expanded.replace(/{{getglobalvar::([^}]+)}}/gi, (match, variablePath) => {
      let value = (0, dependencies.Uu)(context.variables, "globals." + variablePath);
      return undefined === value ? "" : String(value);
    });
    expanded = expanded.replace(/{{setglobalvar::([^:]+)::(.*?)}}/gi, (match, variablePath, value) => {
      let updatedVariables = (0, dependencies.Gu)(context.variables, "set", "globals." + variablePath, value);
      context.variables = updatedVariables;
      context.setVariables(updatedVariables);
      return "";
    });
    expanded = expanded.replace(/{{setvar::([^:]+)::(.*?)}}/gi, (match, variablePath, value) => {
      let updatedVariables = (0, dependencies.Gu)(context.variables, "set", variablePath, value);
      context.variables = updatedVariables;
      context.setVariables(updatedVariables);
      return "";
    });
    expanded = expanded.replace(/{{\s*([a-zA-Z0-9_.[\]]+)\s*}}/g, (match, variablePath) => {
      if (variablePath.includes(":")) return match;
      let value = (0, dependencies.Uu)(context.variables, variablePath);
      return undefined === value ? match : String(value);
    });
    return expanded;
  };
  var compareSlashValues = (left, operator, right) => {
    let leftNumber = Number(left);
    let rightNumber = Number(right);
    let bothNumeric = !isNaN(leftNumber) && !isNaN(rightNumber);
    let leftValue = bothNumeric ? leftNumber : left;
    let rightValue = bothNumeric ? rightNumber : right;
    switch (operator) {
      case "==":
      case "eq":
        return leftValue == rightValue;
      case "===":
        return leftValue === rightValue;
      case "!=":
      case "neq":
        return leftValue != rightValue;
      case "!==":
        return leftValue !== rightValue;
      case ">":
      case "gt":
        return leftValue > rightValue;
      case ">=":
      case "gte":
        return leftValue >= rightValue;
      case "<":
      case "lt":
        return leftValue < rightValue;
      case "<=":
      case "lte":
        return leftValue <= rightValue;
      case "includes":
        return String(left).includes(String(right));
      case "!includes":
        return !String(left).includes(String(right));
      default:
        return false;
    }
  };
  var slashCommandHandlers = {
    echo: async (args, context, rawText) => context.sendMessage(rawText, "system"),
    send: async (args, context, rawText) => context.sendMessage(rawText, "user"),
    sys: async (args, context, rawText) => context.sendMessage(rawText, "system"),
    as: async (args, context, rawText) => {
      if (args.length >= 2) {
        let speakerName = args[0];
        let messageOffset = rawText.indexOf(speakerName) + speakerName.length;
        let message = rawText.substring(messageOffset).trim();
        message.startsWith('"') && message.endsWith('"') && (message = message.slice(1, -1));
        context.sendMessage(`${speakerName}: ${message}`, "system");
      }
    },
    set: async (args, context) => {
      let variablePath = args[0];
      let value = args[1];
      if (variablePath && variablePath.includes("=") && !value) {
        let assignmentParts = variablePath.split("=");
        variablePath = assignmentParts[0];
        value = assignmentParts.slice(1).join("=");
      }
      if (variablePath && undefined !== value) {
        let updatedVariables = (0, dependencies.Gu)(context.variables, "set", variablePath, value);
        context.variables = updatedVariables;
        context.setVariables(updatedVariables);
      }
    },
    var: async (args, context, rawText, execution) => slashCommandHandlers.set(args, context, rawText, execution),
    setvar: async (args, context) => {
      let {
        key: variablePath,
        value: value
      } = parseVariableAssignment(args);
      if (!variablePath) return "";
      let updatedVariables = (0, dependencies.Gu)(context.variables, "set", variablePath, value);
      context.variables = updatedVariables;
      context.setVariables(updatedVariables);
      return String(value ?? "");
    },
    get: async (args, context) => {
      let value = (0, dependencies.Uu)(context.variables, args[0]);
      context.sendMessage(`[System] ${args[0]} = ${value}`, "system");
      return null == value ? "" : String(value);
    },
    getvar: async (args, context) => {
      let {
        named: namedArgs,
        positional: positionalArgs
      } = parseSlashArguments(args);
      let value = (0, dependencies.Uu)(context.variables, namedArgs.key ?? positionalArgs[0]);
      return null == value ? "" : "object" == typeof value ? JSON.stringify(value) : String(value);
    },
    add: async (args, context) => {
      let updatedVariables = (0, dependencies.Gu)(context.variables, "add", args[0], args[1]);
      context.variables = updatedVariables;
      context.setVariables(updatedVariables);
    },
    sub: async (args, context) => {
      let updatedVariables = (0, dependencies.Gu)(context.variables, "sub", args[0], args[1]);
      context.variables = updatedVariables;
      context.setVariables(updatedVariables);
    },
    mul: async (args, context) => {
      let updatedVariables = (0, dependencies.Gu)(context.variables, "mul", args[0], args[1]);
      context.variables = updatedVariables;
      context.setVariables(updatedVariables);
    },
    div: async (args, context) => {
      let updatedVariables = (0, dependencies.Gu)(context.variables, "div", args[0], args[1]);
      context.variables = updatedVariables;
      context.setVariables(updatedVariables);
    },
    setglobalvar: async (args, context) => {
      let assignment = parseVariableAssignment(args);
      let variablePath = "globals." + assignment.key;
      let value = assignment.value;
      if (assignment.key && undefined !== value) {
        let updatedVariables = (0, dependencies.Gu)(context.variables, "set", variablePath, value);
        context.variables = updatedVariables;
        context.setVariables(updatedVariables);
      }
      return String(value ?? "");
    },
    getglobalvar: async (args, context) => {
      let {
        named: namedArgs,
        positional: positionalArgs
      } = parseSlashArguments(args);
      let value = (0, dependencies.Uu)(context.variables, "globals." + (namedArgs.key ?? positionalArgs[0] ?? ""));
      return null == value ? "" : "object" == typeof value ? JSON.stringify(value) : String(value);
    },
    addvar: async (args, context) => {
      let {
        key: variablePath,
        value: value
      } = parseVariableAssignment(args);
      let updatedVariables = (0, dependencies.Gu)(context.variables, "add", variablePath, value);
      context.variables = updatedVariables;
      context.setVariables(updatedVariables);
      let result = (0, dependencies.Uu)(updatedVariables, variablePath);
      return null == result ? "" : String(result);
    },
    incvar: async (args, context) => {
      let {
        named: namedArgs,
        positional: positionalArgs
      } = parseSlashArguments(args);
      let variablePath = namedArgs.key ?? positionalArgs[0] ?? "";
      let amount = parseSlashValue(namedArgs.value ?? positionalArgs[1] ?? "1");
      let updatedVariables = (0, dependencies.Gu)(context.variables, "add", variablePath, amount);
      context.variables = updatedVariables;
      context.setVariables(updatedVariables);
      return String((0, dependencies.Uu)(updatedVariables, variablePath) ?? "");
    },
    decvar: async (args, context) => {
      let {
        named: namedArgs,
        positional: positionalArgs
      } = parseSlashArguments(args);
      let variablePath = namedArgs.key ?? positionalArgs[0] ?? "";
      let amount = parseSlashValue(namedArgs.value ?? positionalArgs[1] ?? "1");
      let updatedVariables = (0, dependencies.Gu)(context.variables, "sub", variablePath, amount);
      context.variables = updatedVariables;
      context.setVariables(updatedVariables);
      return String((0, dependencies.Uu)(updatedVariables, variablePath) ?? "");
    },
    delvar: async (args, context) => {
      let {
        named: namedArgs,
        positional: positionalArgs
      } = parseSlashArguments(args);
      let variablePath = namedArgs.key ?? positionalArgs[0] ?? "";
      let updatedVariables = (0, dependencies.Gu)(context.variables, "delete", variablePath, undefined);
      context.variables = updatedVariables;
      context.setVariables(updatedVariables);
      return "";
    },
    flushvar: async (args, context, rawText, execution) => slashCommandHandlers.delvar(args, context, rawText, execution),
    length: async (args, context) => {
      let targetPath = args[0];
      let value = (0, dependencies.Uu)(context.variables, args[1]);
      let length = 0;
      (Array.isArray(value) || "string" == typeof value) && (length = value.length);
      let updatedVariables = (0, dependencies.Gu)(context.variables, "set", targetPath, length);
      context.variables = updatedVariables;
      context.setVariables(updatedVariables);
    },
    concat: async (args, context) => {
      let targetPath = args[0];
      let combined = "";
      for (let index = 1; index < args.length; index++) combined += String(args[index]);
      let updatedVariables = (0, dependencies.Gu)(context.variables, "set", targetPath, combined);
      context.variables = updatedVariables;
      context.setVariables(updatedVariables);
    },
    jump: async (args, context, rawText, execution) => {
      let labelName = args[0];
      if (undefined === execution.labels[labelName]) {
        context.log("warn", `Label not found: ${labelName}`);
      } else {
        execution.pc = execution.labels[labelName];
      }
    },
    goto: async (args, context, rawText, execution) => slashCommandHandlers.jump(args, context, rawText, execution),
    go: async (args, context, rawText, execution) => slashCommandHandlers.jump(args, context, rawText, execution),
    wait: async (args, context) => {
      let delayMs = Math.min(6e4, Math.max(0, parseInt(args[0], 10)));
      isNaN(delayMs) || (await new Promise(resolve => setTimeout(resolve, delayMs)));
    },
    delay: async (args, context, rawText, execution) => slashCommandHandlers.wait(args, context, rawText, execution),
    lock: async (args, context) => {
      context.setIsInputLocked && context.setIsInputLocked(true);
    },
    unlock: async (args, context) => {
      context.setIsInputLocked && context.setIsInputLocked(false);
    },
    input: async (args, context, rawText) => {
      let inputText = args[0] || rawText;
      window.dispatchEvent(new CustomEvent("sillytavern:set-input", {
        detail: inputText
      }));
    },
    qr: async (args, context, rawText) => {
      if (context.setQuickReplies) {
        let replies = rawText.split("|").map(reply => reply.trim()).filter(Boolean).map(reply => ({
          label: reply,
          message: reply
        }));
        context.setQuickReplies(replies);
      }
    },
    buttons: async (args, context, rawText) => {
      if (context.setQuickReplies) {
        let replies = rawText.split("|").map(reply => {
          let quotedMatch = reply.trim().match(/^"([^"]+)"\s*(.*)$/);
          if (quotedMatch) return {
            label: quotedMatch[1],
            action: quotedMatch[2] || quotedMatch[1]
          };
          let parts = reply.trim().split(/\s+(.+)/);
          return {
            label: parts[0],
            action: parts[1] || parts[0]
          };
        });
        context.setQuickReplies(replies);
      }
    },
    toast: async (args, context, rawText) => {
      let message = args[0] || rawText;
      let severity = args[1] || "info";
      context.showToast && context.showToast(message, severity);
    },
    popup: async (args, context, rawText) => {
      let message = args[0] || rawText;
      context.showPopup && context.showPopup(message);
    },
    bg: async (args, context, rawText) => {
      let background = args[0] || rawText;
      context.setVisualState && context.setVisualState("bg", background);
    },
    music: async (args, context, rawText) => {
      let music = args[0] || rawText;
      context.setVisualState && context.setVisualState("music", music);
    },
    sound: async (args, context, rawText) => {
      let sound = args[0] || rawText;
      context.setVisualState && context.setVisualState("sound", sound);
    },
    label: async () => {},
    comment: async () => "",
    pass: async (args, context, rawText) => rawText,
    stop: async () => false
  };
  return {
    tp: tokenizeSlashCommand,
    ip: expandSlashMacros,
    op: compareSlashValues,
    sp: slashCommandHandlers
  };
}