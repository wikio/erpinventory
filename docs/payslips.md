# Algerian Payslip Management

Section 299 adds the lazy-loaded `#payslips` HR route. IndexedDB schema version 18 stores one payslip per employee/pay period and MySQL uses `sql/migrations/008_payslip_management.sql`.

Each payslip links the employee, optional salary-progression row, optional CNAS declaration, and a `documentTemplates` template of type `payslip`. Gross pay includes base salary, seniority, bonuses, allowances, and overtime. Employee/employer CNAS are separated; IRG uses a progressive annualized scale with a monthly salary abatement and remains visible in the calculation summary. Advances, loans, other deductions, leave, worked time, and payment details are persisted.

The payslip template uses the existing drag/resize designer with payroll merge fields. Generating a payslip renders the configured A4/Letter template, exposes the standard PDF/print pipeline, creates a PDF Blob, and archives it in GED with links to both the payslip and employee. Regeneration versions the same GED document.
