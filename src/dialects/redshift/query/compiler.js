
// Redshift Query Builder & Compiler
// ------
import inherits from 'inherits';

import QueryCompiler from '../../../query/compiler';
import QueryCompiler_PG from '../../postgres/query/compiler';
import * as helpers from '../../../helpers';

import { assign, reduce } from 'lodash';

function QueryCompiler_Redshift(client, builder) {
  QueryCompiler_PG.call(this, client, builder);
}
inherits(QueryCompiler_Redshift, QueryCompiler_PG);

assign(QueryCompiler_Redshift.prototype, {
  truncate() {
    return `truncate ${this.tableName.toLowerCase()}`;
  },

  // Compiles an `insert` query, allowing for multiple
  // inserts using a single query statement.
  insert() {
    const sql = QueryCompiler.prototype.insert.apply(this, arguments);
    if (sql === '') return sql;
    this._slightReturn();
    return {
      sql,
    };
  },

  // Compiles an `update` query, warning on unsupported returning
  update() {
    const sql = QueryCompiler.prototype.update.apply(this, arguments);
    this._slightReturn();
    return {
      sql,
    };
  },

  // Compiles an `delete` query, warning on unsupported returning
  del() {
    const sql = QueryCompiler.prototype.del.apply(this, arguments);
    this._slightReturn();
    return {
      sql,
    };
  },

  // simple: if trying to return, warn
  _slightReturn(){
    if (this.single.isReturning) {
      helpers.warn('insert/update/delete returning is not supported by redshift dialect');
    }
  },

  forUpdate() {
    helpers.warn('table lock is not supported by redshift dialect');
    return '';
  },

  forShare() {
    helpers.warn('lock for share is not supported by redshift dialect');
    return '';
  },

  // Compiles a columnInfo query
  columnInfo() {
    const column = this.single.columnInfo;

    let sql = 'select * from information_schema.columns where table_name = ? and table_catalog = ?';
    const bindings = [this.single.table.toLowerCase(), this.client.database().toLowerCase()];

    if (this.single.schema) {
      sql += ' and table_schema = ?';
      bindings.push(this.single.schema);
    } else {
      sql += ' and table_schema = current_schema()';
    }

    return {
      sql,
      bindings,
      output(resp) {
        const out = reduce(resp.rows, function(columns, val) {
          columns[val.column_name] = {
            type: val.data_type,
            maxLength: val.character_maximum_length,
            nullable: (val.is_nullable === 'YES'),
            defaultValue: val.column_default
          };
          return columns;
        }, {});
        return column && out[column] || out;
      }
    };
  }
})

export default QueryCompiler_Redshift;
