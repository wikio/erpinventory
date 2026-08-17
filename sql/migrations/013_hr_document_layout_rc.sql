-- Advanced HR layouts/templates and multi-RC fiscal source selection.
ALTER TABLE trade_registers ADD COLUMN IF NOT EXISTS register_kind VARCHAR(16) NOT NULL DEFAULT 'annexe';
ALTER TABLE trade_registers ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX idx_trade_register_kind ON trade_registers (register_kind);
CREATE INDEX idx_trade_register_default ON trade_registers (is_default);

-- Enforce one principal/default RC at application level for cross-engine compatibility.
-- Document selections remain represented in payload_json by fiscalSource + rcId.
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS top_html LONGTEXT NULL;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS notes_html LONGTEXT NULL;
ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS articles_json JSON NULL;

ALTER TABLE conflict_declaration_templates ADD COLUMN IF NOT EXISTS description_html LONGTEXT NULL;
-- steps_json / questions_json / commitments_json contain stable IDs and explicit sort order.
