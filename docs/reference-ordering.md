# Reference ordering and immutable technical IDs

Reference-bearing entities use two independent numeric values:

- `numericId`: immutable technical key. It is assigned once by IndexedDB/MySQL and is never accepted from edit forms.
- `order`: editable 1-based business sequence used by `{SEQ}` in reference-code masks.

## Resequencing strategy

SARI uses **stable full compaction** within each entity store:

1. Remove the edited/new record from the current ordered list.
2. Insert it at the requested 1-based `order` position (clamped to `1..N+1`).
3. Reassign contiguous values `1..N` to every record.
4. Regenerate every affected `referenceCode` from its unchanged mask and new `order`.
5. Queue affected records for the external database connector.

Existing records with missing or duplicate orders are sorted by prior order, creation date, immutable `numericId`, then legacy string ID before compaction. Deletion also compacts the remaining sequence. This makes historical inserts deterministic while technical IDs remain untouched.

MySQL stores the field as `display_order` because `ORDER` is a reserved SQL keyword. Migration `005_reference_order_sequence.sql` adds and backfills that column for all reference-bearing relational entities.
