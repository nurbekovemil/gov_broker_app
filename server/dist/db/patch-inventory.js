"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pool_1 = require("./pool");
/** Идемпотентно добавляет available_quantity к уже существующей БД (без повторного schema.sql). */
async function patch() {
    const sql = fs_1.default.readFileSync(path_1.default.join(__dirname, 'alter_available_quantity.sql'), 'utf-8');
    await pool_1.pool.query(sql);
    console.log('Patch available_quantity applied');
    await pool_1.pool.end();
}
patch().catch((err) => {
    console.error('Patch failed:', err);
    process.exit(1);
});
