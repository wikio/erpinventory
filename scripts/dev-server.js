'use strict';

// Cross-platform development launcher. Shell syntax such as
// `PORT=3001 node server.js` does not work in Windows PowerShell/cmd.exe.
process.env.PORT ||= '3001';
require('../server');
