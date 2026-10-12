/**
 * FakeDatabase: a minimal statement-aware in-memory SQL engine covering the
 * statements Thirunellai's schema/migrations/repositories issue. Used by the
 * jest expo-sqlite mock so database logic is exercised end-to-end in tests.
 */

function escapeLike(str) {
  return String(str).replace(/[.+^{}()|[\]\\]/g, '\\$&');
}

function matchesWhere(rowVal, op, param) {
  if (op === '=') return rowVal === param;
  if (op === 'LIKE') {
    var pattern = escapeLike(param).split('%').join('.*').split('_').join('.');
    return new RegExp('^' + pattern + '$', 'i').test(String(rowVal == null ? '' : rowVal));
  }
  if (op === '<=') return Number(rowVal) <= Number(param);
  if (op === '>=' && typeof rowVal === 'string' && typeof param === 'string') return rowVal >= param;
  if (op === '>=' && rowVal != null && param != null) return Number(rowVal) >= Number(param);
  return false;
}

function FakeTable(name) {
  this.name = name;
  this.rows = [];
  this.autoInc = 0;
}

function FakeDb() {
  this.tables = {};
}

FakeDb.prototype.getOrCreate = function (name) {
  if (!this.tables[name]) this.tables[name] = new FakeTable(name);
  return this.tables[name];
};

FakeDb.prototype.execSync = function (sql) { return this.exec(typeof sql === 'string' ? sql : ''); };
FakeDb.prototype.execAsync = async function (sql) { return this.exec(typeof sql === 'string' ? sql : ''); };
FakeDb.prototype.closeSync = function () {};
FakeDb.prototype.closeAsync = async function () {};
FakeDb.prototype.withTransactionAsync = async function (fn) { await fn(); };

/**
 * exec() handles multiple statements; we only model `CREATE [TEMP] TABLE [IF
 * NOT EXISTS] name (...)` so schema migrations register table names with the
 * engine (rows are not validated; repositories define their own row shapes).
 */
FakeDb.prototype.exec = function (sql) {
  var re = /CREATE\s+(?:TEMP\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_]+)/gi;
  var m;
  var created = [];
  while ((m = re.exec(sql)) !== null) {
    var name = m[1].toLowerCase();
    if (!this.tables[name]) this.getOrCreate(name);
    created.push(name);
  }
  // Materialize sqlite_master rows so catalog queries work.
  if (created.length) {
    var master = this.getOrCreate('sqlite_master');
    created.forEach(function (name) {
      var dup = master.rows.some(function (r) { return r.name === name; });
      if (!dup) master.rows.push({ type: 'table', name: name });
    });
  }
  // Also plain `CREATE INDEX IF NOT EXISTS ...` statements are a no-op.
  return undefined;
};

FakeDb.prototype.parseSelect = function (sql) {
  var table = (sql.match(/FROM\s+([a-zA-Z_]+)/i) || [])[1] || '';
  // Two-table INNER JOIN on `a.col = b.col` (the only join shape this codebase
  // issues): flat rows of the joined tables with prefix-collision-free merge.
  var joinMatch = sql.match(/FROM\s+([a-zA-Z_]+)\s+([a-zA-Z_]+)\s+JOIN\s+([a-zA-Z_]+)\s+([a-zA-Z_]+)\s+ON\s+([a-zA-Z_]+)\.([a-zA-Z_]+)\s*=\s*([a-zA-Z_]+)\.([a-zA-Z_]+)/i);
  var join = null;
  var joinWhereAlias = null;
  if (joinMatch) {
    // ON pairs are captured with their TEXTUAL alias; map them back onto the
    // physical FROM/JOIN table order so the nested loop compares the correct
    // columns (`ON f.id = fo.festival_id` may list the JOIN table first).
    var aliasToTable = {};
    aliasToTable[joinMatch[2].toLowerCase()] = joinMatch[1].toLowerCase(); // FROM alias
    aliasToTable[joinMatch[4].toLowerCase()] = joinMatch[3].toLowerCase(); // JOIN alias
    var leftCol, rightCol;
    if (joinMatch[5].toLowerCase() === joinMatch[2].toLowerCase()) {
      leftCol = joinMatch[6].toLowerCase(); rightCol = joinMatch[8].toLowerCase();
    } else {
      leftCol = joinMatch[8].toLowerCase(); rightCol = joinMatch[6].toLowerCase();
    }
    join = { leftTable: joinMatch[1].toLowerCase(), rightTable: joinMatch[3].toLowerCase(), leftCol: leftCol, rightCol: rightCol };
    var joinWhereMatch = sql.match(/WHERE\s+([a-zA-Z_]+)\.([a-zA-Z_]+)\s*(=|LIKE|<=|>=)\s*(\?|'([^']*)'|\d+(\.\d+)?)/i);
    if (joinWhereMatch) {
      var isParam = joinWhereMatch[4] === '?';
      var jv;
      if (isParam) jv = undefined;
      else if (joinWhereMatch[5] != null) jv = joinWhereMatch[5];
      else jv = Number(joinWhereMatch[4]);
      joinWhereAlias = { alias: joinWhereMatch[1].toLowerCase(), lsCol: joinWhereMatch[2].toLowerCase(), op: joinWhereMatch[3].toUpperCase(), value: jv, isParam: isParam };
    }
  }
  var where = null;
  var whereMatch = !join ? sql.match(/WHERE\s+([\s\S]+?)(?:ORDER BY|LIMIT|GROUP BY|$)/i) : null;
  if (whereMatch) {
    var cond = whereMatch[1].trim().replace(/^\(/, '').replace(/\)$/, '');
    var m = cond.match(/([a-z_]+)\s*(=|LIKE|<=|>=)\s*(\?|'([^']*)'|\d+(\.\d+)?)/i);
    if (m) {
      var value;
      if (m[3] === '?') value = undefined;
      else if (m[4] != null) value = m[4];
      else value = Number(m[3]);
      where = { col: m[1], op: m[2].toUpperCase(), value: value };
    }
  }
  var orderMatch = sql.match(/ORDER BY\s+([a-z_ ]+?)(\s+DESC)?\s*(?:LIMIT|$)/i);
  var orderBy = null;
  if (orderMatch) {
    orderBy = { col: orderMatch[1].split(',')[0].trim(), desc: !!orderMatch[2] };
  }
  var limitMatch = sql.match(/LIMIT\s+(\d+)/i);
  var limit = limitMatch ? Number(limitMatch[1]) : undefined;
  var aggregates = null;
  var agg = sql.match(/(COUNT|MIN|MAX|SUM)\s*\(\s*\*?\s*\)(?:\s+AS\s+([a-z_]+))?/i);
  if (agg) {
    var alias = agg[2];
    if (!alias) {
      if (/COUNT/i.test(agg[1])) alias = 'c';
      else if (/MIN/i.test(agg[1])) alias = 'date_key';
      else alias = 'value';
    }
    aggregates = { fn: agg[1].toUpperCase(), alias: alias.toLowerCase() };
  }
  var cols = [];
  var selMatch = sql.match(/SELECT\s+([\s\S]+?)\s+FROM/i);
  var selectAll = selMatch && /^\*$/i.test(selMatch[1].trim());
  if (selMatch && !selectAll && (!aggregates || (/GROUP\s+BY/i.test(sql)))) {
    // With GROUP BY the SELECT list names a real column plus the aggregate;
    // collect the plain column (needed as the group key) even when an
    // aggregate is present.
    selMatch[1].split(',').forEach(function (part) {
      var p = part.trim();
      if (!/(COUNT|MIN|MAX|SUM)\s*\(/i.test(p)) {
        // Strip `col AS alias` to the alias (outputs are aliased).
        var asMatch = p.match(/\s+AS\s+([a-z_]+)/i);
        cols.push((asMatch ? asMatch[1] : p).toLowerCase());
      }
    });
  }
  return { table: table, join: join, joinWhereAlias: joinWhereAlias, groupBy: /GROUP\s+BY/i.test(sql), cols: cols, selectAll: !!selectAll && !aggregates, where: where, orderBy: orderBy, limit: limit, aggregates: aggregates };
};

FakeDb.prototype.select = function (sql, params) {
  var parsed = this.parseSelect(sql);
  var rows;
  if (parsed.join) {
    // Nested-loop join: merge left+right rows into a single flat object per
    // matching pair. Left columns win on name collisions, then right fills.
    var lt = this.tables[parsed.join.leftTable];
    var rt = this.tables[parsed.join.rightTable];
    rows = [];
    (lt ? lt.rows : []).forEach(function (l) {
      (rt ? rt.rows : []).forEach(function (r) {
        if (String(l[parsed.join.leftCol]) === String(r[parsed.join.rightCol])) {
          var merged = Object.assign({}, r, l);
          if (parsed.joinWhereAlias) {
            var jw = parsed.joinWhereAlias;
            rows.push({ __merged: merged, __jw: jw });
          } else {
            rows.push(merged);
          }
        }
      });
    });
    if (parsed.joinWhereAlias) {
      rows = rows
        .filter(function (x) {
          var jw = x.__jw;
          var m = x.__merged;
          var val = m[jw.lsCol] != null ? m[jw.lsCol] : null;
          // Alias-qualified `WHERE alias.col = ?` evaluates against the
          // positional param when the SQL token was '?'.
          var cmpVal = jw.isParam ? params[0] : jw.value;
          return matchesWhere(val, jw.op, cmpVal);
        })
        .map(function (x) { return x.__merged; });
    }
    if (parsed.limit !== undefined) rows = rows.slice(0, parsed.limit);
    return { parsed: parsed, rows: rows };
  }
  var t = this.tables[parsed.table];
  rows = t ? t.rows.slice(0) : [];
  if (parsed.where) {
    var value = parsed.where.value !== undefined ? parsed.where.value : params[0];
    rows = rows.filter(function (r) {
      return matchesWhere(r[parsed.where.col] != null ? r[parsed.where.col] : null, parsed.where.op, value);
    });
  }
  if (parsed.orderBy) {
    var col = parsed.orderBy.col;
    var desc = parsed.orderBy.desc;
    rows.sort(function (a, b) {
      var va = a[col] == null ? '' : a[col];
      var vb = b[col] == null ? '' : b[col];
      var cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return desc ? -cmp : cmp;
    });
  }
  if (parsed.limit !== undefined) rows = rows.slice(0, parsed.limit);
  return { parsed: parsed, rows: rows };
};

FakeDb.prototype.projectRows = function (res) {
  if (res.parsed.aggregates) {
    var agg = res.parsed.aggregates;
    if (res.parsed.groupBy) {
      // Grouped aggregate: one output row per distinct group-key value.
      // The group column is whatever was selected alongside the aggregate.
      var keyCol = res.parsed.cols.length
        ? res.parsed.cols[0]
        : agg.alias;
      var groups = {};
      res.rows.forEach(function (r) {
        var key = String(r[keyCol]);
        if (!groups[key]) groups[key] = { group: key };
        groups[key][agg.alias] = (groups[key][agg.alias] || 0) + 1;
      });
      return Object.keys(groups).map(function (k) {
        var g = groups[k];
        g[keyCol] = g.group;
        delete g.group;
        return g;
      });
    }
    if (agg.fn === 'COUNT') return [{ c: res.rows.length }];
    return [];
  }
  if (res.parsed.cols.length && !res.parsed.selectAll) {
    return res.rows.map(function (r) {
      var out = {};
      res.parsed.cols.forEach(function (c) {
        // Accept alias-qualified names (`fo.date_key`): match on the bare
        // column too, since merged rows store unqualified keys.
        if (c in r) out[c] = r[c];
        else if (c.indexOf('.') >= 0) {
          var bare = c.split('.').pop();
          if (bare in r) out[bare] = r[bare];
        }
      });
      return out;
    });
  }
  return res.rows.slice(0);
};

FakeDb.prototype.getAllSync = function (sql) {
  var params = Array.prototype.slice.call(arguments, 1);
  var res = this.select(sql, params);
  return this.projectRows(res);
};

FakeDb.prototype.getFirstSync = function (sql) {
  var rows = this.getAllSync.apply(this, arguments);
  return rows.length ? rows[0] : null;
};

FakeDb.prototype.getAllAsync = async function (sql) {
  var params = Array.prototype.slice.call(arguments, 1);
  var res = this.select(sql, params);
  return this.projectRows(res);
};

FakeDb.prototype.getFirstAsync = async function (sql) {
  var params = Array.prototype.slice.call(arguments, 1);
  var rows = await this.getAllAsync.apply(this, arguments);
  return rows.length ? rows[0] : null;
};

/** Split a VALUES(...) list into top-level tokens (minding quoted strings). */
function splitValues(list) {
  var tokens = [];
  var current = '';
  var inString = false;
  for (var i = 0; i < list.length; i++) {
    var ch = list[i];
    if (inString) {
      current += ch;
      if (ch === "'") inString = false;
    } else if (ch === "'") {
      inString = true;
      current += ch;
    } else if (ch === ',') {
      tokens.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) tokens.push(current.trim());
  return tokens;
}

FakeDb.prototype.run = function (sql, params) {
  var insertMatch = sql.match(/INSERT\s+(?:OR\s+(?:REPLACE|IGNORE)\s+)?INTO\s+([a-z_]+)/i);
  // Plain UPDATE: not part of an INSERT ... ON CONFLICT ... DO UPDATE upsert.
  var isUpsert = /ON\s+CONFLICT\s*\([^)]*\)\s+DO\s+UPDATE/i.test(sql);
  var updateMatch = !isUpsert ? sql.match(/UPDATE\s+([a-z_]+)/i) : null;
  var deleteMatch = sql.match(/DELETE(?:\s+FROM)?\s+([a-z_]+)/i);
  var tableName = (insertMatch && insertMatch[1]) || (updateMatch && updateMatch[1]) || (deleteMatch && deleteMatch[1]);
  if (!tableName) return { changes: 0, lastInsertRowId: 0 };
  var t = this.getOrCreate(tableName);

  if (deleteMatch) {
    var whereCol = (sql.match(/WHERE\s+([a-z_]+)\s*=/i) || [])[1];
    var before = t.rows.length;
    if (whereCol) {
      t.rows = t.rows.filter(function (r) { return String(r[whereCol]) !== String(params[0]); });
    } else {
      t.rows = [];
    }
    return { changes: before - t.rows.length, lastInsertRowId: 0 };
  }

  // Treat `INSERT ... ON CONFLICT(...) DO UPDATE SET` as a true upsert: when a
  // row with the same conflict key exists, apply the DO UPDATE SET columns;
  // otherwise insert normally.
  var earlyRowValues = null;
  var conflictMatch = sql.match(/ON\s+CONFLICT\s*\(([^)]+)\)\s+DO\s+UPDATE\s+SET\s+([\s\S]+)$/i);
  if (insertMatch) {
    var colsMatchEarly = sql.match(/INSERT\s+(?:OR\s+(?:REPLACE|IGNORE)\s+)?INTO\s+[a-z_]+\s*\(([^)]+)\)/i);
    var declaredColsEarly = colsMatchEarly
      ? colsMatchEarly[1].split(',').map(function (c) { return c.trim().toLowerCase(); })
      : [];
    // Row values come from the VALUES clause: '?' tokens map to params in
    // order; string/number literals map to themselves. This supports forms
    // like `VALUES ('literal_key', ?)` and `VALUES ('kind', ?, ?, ?, ?)`
    // where literals and params are mixed. Computed for ALL inserts (also
    // used by the non-conflict insert path below).
    var valuesMatch = !declaredColsEarly.length
      ? null
      : sql.match(/VALUES\s*\(([^)]+)\)/i);
    var valuesTokens = valuesMatch ? splitValues(valuesMatch[1]) : null;
    var earlyRow = {};
    earlyRowValues = {};
    var paramIdx = 0;
    declaredColsEarly.forEach(function (c, i) {
      var token = valuesTokens ? valuesTokens[i] : '?';
      var value;
      if (valuesMatch) {
        var t2 = token.trim();
        if (t2 === '?') {
          value = params[paramIdx] != null ? params[paramIdx] : null;
          paramIdx += 1;
        } else if (t2.charAt(0) === "'") {
          value = t2.slice(1, -1);
        } else if (t2 === 'NULL') {
          value = null;
        } else {
          value = Number(t2);
        }
      } else {
        value = params[i] != null ? params[i] : null;
      }
      earlyRow[c] = value;
      earlyRowValues[c] = value;
    });
  }
  if (conflictMatch) {
    var conflictCol = conflictMatch[1].trim().toLowerCase();
    var conflictVal = earlyRowValues ? earlyRowValues[conflictCol] : params[0];
    var existIdx = -1;
    for (var k = 0; k < t.rows.length; k++) {
      if (String(t.rows[k][conflictCol]) === String(conflictVal)) { existIdx = k; break; }
    }
    if (existIdx >= 0) {
      var upSetCols = conflictMatch[2]
        .split(',')
        .map(function (s) { return s.trim().split('=')[0].trim().toLowerCase(); })
        .filter(function (c) { return c !== 'excluded.text' && c !== '' && !/^excluded\./.test(c); });
      // The DO UPDATE SET values reference excluded.<col>; params are aligned
      // with the VALUES clause (same order as declared columns), so set each
      // SET column from the insert params by column name.
      var upSetColsAll = conflictMatch[2]
        .split(',')
        .map(function (s) { return s.trim(); });
      var declaredCols = declaredColsEarly;
      var target = t.rows[existIdx];
      upSetColsAll.forEach(function (assignment) {
        var m = assignment.match(/([a-z_]+)\s*=\s*excluded\.([a-z_]+)/i);
        if (!m) return;
        var destCol = m[1].trim().toLowerCase();
        var srcCol = m[2].trim().toLowerCase();
        var srcIdx = declaredCols.indexOf(srcCol);
        if (srcIdx >= 0 && earlyRowValues) {
          target[destCol] = earlyRowValues[srcCol] != null ? earlyRowValues[srcCol] : null;
        }
      });
      return { changes: 1, lastInsertRowId: 0 };
    }
    // No conflict: fall through to normal INSERT below.
  }

  if (updateMatch) {
    var setMatch = sql.match(/SET\s+([\s\S]+?)\s+WHERE/i);
    var whereColU = (sql.match(/WHERE\s+([a-z_]+)\s*=/i) || [])[1];
    var changes = 0;
    if (setMatch && whereColU) {
      var setCols = setMatch[1].split(',').map(function (s) { return s.trim().split('=')[0].trim().toLowerCase(); });
      var setVals = params.slice(0, setCols.length);
      var keyVal = params[params.length - 1];
      t.rows.forEach(function (r) {
        if (String(r[whereColU]) === String(keyVal)) {
          setCols.forEach(function (c, i) { r[c] = setVals[i]; });
          changes++;
        }
      });
    }
    return { changes: changes, lastInsertRowId: 0 };
  }

  var colsMatch = sql.match(/INSERT\s+(?:OR\s+(?:REPLACE|IGNORE)\s+)?INTO\s+[a-z_]+\s*\(([^)]+)\)/i);
  var hasExplicitCols = !!colsMatch;
  var row = {};
  if (hasExplicitCols) {
    // Prefer the row already computed from the VALUES clause (correctly maps
    // literals + '?' params); fall back to positional params when it is absent
    // (e.g. multi-row VALUES or non-VALUES inserts).
    if (earlyRowValues && Object.keys(earlyRowValues).length) {
      row = Object.assign({}, earlyRowValues);
    } else {
      colsMatch[1].split(',').forEach(function (c, i) {
        row[c.trim().toLowerCase()] = params[i] != null ? params[i] : null;
      });
    }
  } else {
    params.forEach(function (p, i) { row['col' + i] = p != null ? p : null; });
  }
  var isReplace = /INSERT\s+OR\s+REPLACE/i.test(sql);
  var pk = hasExplicitCols ? colsMatch[1].split(',')[0].trim().toLowerCase() : 'id';
  if (/INSERT\s+OR\s+IGNORE/i.test(sql)) {
    var existingIdx = -1;
    for (var j = 0; j < t.rows.length; j++) {
      if (String(t.rows[j][pk]) === String(row[pk])) { existingIdx = j; break; }
    }
    if (existingIdx >= 0) {
      // IGNORE: do nothing on conflict.
      return { changes: 0, lastInsertRowId: 0 };
    }
  }
  if (isReplace) {
    var idx = -1;
    for (var i = 0; i < t.rows.length; i++) {
      if (String(t.rows[i][pk]) === String(row[pk])) { idx = i; break; }
    }
    if (idx >= 0) t.rows[idx] = row;
    else { t.autoInc += 1; t.rows.push(row); }
  } else {
    t.autoInc += 1;
    if (hasExplicitCols && !row.id) row.id = t.autoInc;
    t.rows.push(row);
  }
  var lastId = row.id != null ? Number(row.id) : t.autoInc;
  return { changes: 1, lastInsertRowId: lastId };
};

FakeDb.prototype.runSync = function (sql) {
  var params = Array.prototype.slice.call(arguments, 1);
  return this.run(sql, params);
};

FakeDb.prototype.runAsync = async function (sql) {
  var params = Array.prototype.slice.call(arguments, 1);
  return this.run(sql, params);
};

module.exports = FakeDb;
