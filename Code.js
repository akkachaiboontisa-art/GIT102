var DB_SPREADSHEET_ID = '1vRtCsO_qDaaolLO9dNXbRyemTodItclL3ROGPl6aQ9w';
var DB_FOLDER_ID = '1W3-rorw55-M4khvZeV-jDomLjcoeIDHZ';

function doGet(e) {
  var params = e ? e.parameter : {};
  var t = HtmlService.createTemplateFromFile('Index');
  t.initialView = params.view || '';
  t.initialAssignmentId = params.assignmentId || '';
  var html = t.evaluate()
    .setTitle('Whiteboard Homework')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return html;
}

function dtStr_(d) {
  if (d == null) return '';
  if (Object.prototype.toString.call(d) === '[object Date]' && !isNaN(d.getTime())) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ssXXX");
  }
  return String(d);
}

function getDb_() {
  var props = PropertiesService.getScriptProperties();
  var id = DB_SPREADSHEET_ID || props.getProperty('DB_SPREADSHEET_ID');
  if (!id) {
    var ss = SpreadsheetApp.create('Whiteboard Homework DB');
    id = ss.getId();
    props.setProperty('DB_SPREADSHEET_ID', id);
  }
  var sheet = SpreadsheetApp.openById(id);
  ensureSheets_(sheet);
  return sheet;
}

function ensureSheets_(ss) {
  var defs = {
    'Users': ['Email', 'Name', 'Role'],
    'Assignments': ['Assignment ID', 'Title', 'Description', 'Created Date', 'Created By', 'Assigned To'],
    'Submissions': ['Submission ID', 'Assignment ID', 'Student Email', 'Status', 'Image URL', 'Submitted Date']
  };
  Object.keys(defs).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) sh.appendRow(defs[name]);
  });
}

function getMe() {
  var email = Session.getActiveUser().getEmail();
  if (!email) return { email: '', name: '', role: '' };
  var sh = getDb_().getSheetByName('Users');
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase() === email.toLowerCase()) {
      return { email: email, name: values[i][1], role: values[i][2] };
    }
  }
  var deployer = Session.getEffectiveUser().getEmail();
  if (deployer && deployer.toLowerCase() === email.toLowerCase()) {
    addUser(email, 'Teacher', 'Teacher');
    return { email: email, name: 'Teacher', role: 'Teacher' };
  }
  return { email: email, name: email, role: '' };
}

function addUser(email, name, role) {
  email = String(email || '').trim().toLowerCase();
  name = String(name || '').trim();
  role = String(role || '').trim();
  if (!email || !name) throw new Error('Email and name are required.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Invalid email address.');
  if (role !== 'Teacher' && role !== 'Student') throw new Error('Role must be Teacher or Student.');
  var sh = getDb_().getSheetByName('Users');
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase() === email) {
      sh.getRange(i + 1, 2, 1, 2).setValues([[name, role]]);
      return { created: false, email: email };
    }
  }
  sh.appendRow([email, name, role]);
  return { created: true, email: email };
}

function getStudentList() {
  return getDb_().getSheetByName('Users').getDataRange().getValues()
    .slice(1)
    .filter(function (r) { return r[0] && String(r[2]).toLowerCase() === 'student'; })
    .map(function (r) { return { email: r[0], name: r[1] }; });
}

function createAssignment(title, desc, assignedTo) {
  if (!title || !desc) throw new Error('Title and description are required.');
  var id = 'A-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
  getDb_().getSheetByName('Assignments').appendRow([id, title, desc, new Date(), Session.getActiveUser().getEmail(), assignedTo || 'All']);
  return { id: id };
}

function getAssignmentDetail(assignmentId) {
  var rows = getDb_().getSheetByName('Assignments').getDataRange().getValues().slice(1);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] === assignmentId) {
      return { id: rows[i][0], title: rows[i][1], description: rows[i][2], createdDate: dtStr_(rows[i][3]), createdBy: rows[i][4], assignedTo: rows[i][5] };
    }
  }
  return null;
}

function getAssignments(userEmail) {
  var ss = getDb_();
  var aRows = ss.getSheetByName('Assignments').getDataRange().getValues().slice(1);
  var sRows = ss.getSheetByName('Submissions').getDataRange().getValues().slice(1);
  var done = {};
  sRows.forEach(function (r) {
    if (r[3] === 'Submitted') done[r[1] + '|' + String(r[2]).toLowerCase()] = true;
  });
  return aRows.filter(function (r) {
    if (!r[0]) return false;
    var to = String(r[5]).trim().toLowerCase();
    if (to !== 'all' && to !== userEmail.toLowerCase()) return false;
    return !done[r[0] + '|' + userEmail.toLowerCase()];
  }).map(function (r) {
    return { id: r[0], title: r[1], description: r[2], createdDate: dtStr_(r[3]), createdBy: r[4], assignedTo: r[5] };
  });
}

function getSubmittedWork(userEmail) {
  var ss = getDb_();
  var aMap = {};
  ss.getSheetByName('Assignments').getDataRange().getValues().slice(1).forEach(function (r) {
    if (r[0]) aMap[r[0]] = r;
  });
  return ss.getSheetByName('Submissions').getDataRange().getValues().slice(1)
    .filter(function (r) { return r[2] && String(r[2]).toLowerCase() === userEmail.toLowerCase(); })
    .map(function (r) {
      var a = aMap[r[1]] || [];
      return { id: r[0], assignmentId: r[1], title: a[1] || 'Untitled', description: a[2] || '', status: r[3], imageUrl: r[4], submittedDate: dtStr_(r[5]) };
    });
}

function getTeacherAssignments() {
  var ss = getDb_();
  var counts = {};
  ss.getSheetByName('Submissions').getDataRange().getValues().slice(1).forEach(function (r) {
    if (r[3] === 'Submitted') counts[r[1]] = (counts[r[1]] || 0) + 1;
  });
  return ss.getSheetByName('Assignments').getDataRange().getValues().slice(1)
    .filter(function (r) { return r[0]; })
    .map(function (r) {
      return { id: r[0], title: r[1], description: r[2], createdDate: dtStr_(r[3]), createdBy: r[4], assignedTo: r[5], submittedCount: counts[r[0]] || 0 };
    });
}

function getStudentSubmissions(assignmentId) {
  var ss = getDb_();
  var nameMap = {};
  ss.getSheetByName('Users').getDataRange().getValues().slice(1).forEach(function (r) {
    if (r[0]) nameMap[String(r[0]).toLowerCase()] = r[1];
  });
  return ss.getSheetByName('Submissions').getDataRange().getValues().slice(1)
    .filter(function (r) { return r[1] === assignmentId; })
    .map(function (r) {
      return { id: r[0], studentEmail: r[2], studentName: nameMap[String(r[2]).toLowerCase()] || r[2], status: r[3], imageUrl: r[4], submittedDate: dtStr_(r[5]) };
    });
}

function getSubmissionsFolder_() {
  if (DB_FOLDER_ID) return DriveApp.getFolderById(DB_FOLDER_ID);
  var it = DriveApp.getFoldersByName('Whiteboard Submissions');
  return it.hasNext() ? it.next() : DriveApp.createFolder('Whiteboard Submissions');
}

function saveCanvasImage(base64Data, assignmentId, userEmail) {
  if (!base64Data || !assignmentId || !userEmail) throw new Error('Missing required parameters.');
  var m = String(base64Data).match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  var base64 = m ? m[2] : base64Data;
  var mime = m ? m[1].toLowerCase() : 'image/png';
  var ext = mime === 'image/png' ? 'png' : 'jpg';
  var bytes = Utilities.base64Decode(base64);
  var safeEmail = userEmail.replace(/[^a-z0-9._@-]/gi, '_');
  var blob = Utilities.newBlob(bytes, mime, 'submission_' + assignmentId + '_' + safeEmail + '.' + ext);
  var file = getSubmissionsFolder_().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var sh = getDb_().getSheetByName('Submissions');
  var values = sh.getDataRange().getValues();
  var found = -1;
  for (var i = 1; i < values.length; i++) {
    if (values[i][1] === assignmentId && String(values[i][2]).toLowerCase() === userEmail.toLowerCase()) { found = i; break; }
  }
  var now = new Date();
  if (found > -1) {
    sh.getRange(found + 1, 4, 1, 3).setValues([['Submitted', file.getUrl(), now]]);
  } else {
    sh.appendRow([Utilities.getUuid(), assignmentId, userEmail, 'Submitted', file.getUrl(), now]);
  }
  return { url: file.getUrl(), fileName: file.getName() };
}
