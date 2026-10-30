(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fileInput = $('workbookFile');
  const sheetSelect = $('sheetSelect');
  const loadButton = $('loadSheet');
  const fileStatus = $('fileStatus');
  let workbook = null;
  let currentRows = [];
  let currentHeaders = [];

  const normalize = value => String(value ?? '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  const findIndex = (headers, candidates) => {
    const wanted = candidates.map(normalize);
    return headers.findIndex(value => wanted.includes(normalize(value)));
  };
  const cell = (row, headers, candidates) => {
    const index = findIndex(headers, candidates);
    return index < 0 ? '' : (row[index] ?? '');
  };
  const text = value => String(value ?? '').trim();
  const money = value => {
    if (typeof value === 'number') return value;
    const parsed = Number(String(value ?? '').replace(/[₱,\s]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const formatMoney = value => new Intl.NumberFormat('en-PH', {style:'currency',currency:'PHP',maximumFractionDigits:0}).format(value || 0);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  fileInput.addEventListener('change', async () => {
    workbook = null;
    currentRows = [];
    $('dashboard').hidden = true;
    sheetSelect.innerHTML = '<option value="">Choose worksheet</option>';
    sheetSelect.disabled = true;
    loadButton.disabled = true;
    const file = fileInput.files && fileInput.files[0];
    if (!file) { fileStatus.textContent = 'No workbook loaded. Nothing is sent to a server.'; return; }
    if (!/\.(xlsx|xlsm|xls)$/i.test(file.name)) { fileStatus.textContent = 'Please choose an Excel workbook (.xlsx, .xlsm, or .xls).'; return; }
    if (!window.XLSX) { fileStatus.textContent = 'The Excel-reading library could not load. Check your internet connection or ask IT to approve a locally hosted library.'; return; }
    try {
      fileStatus.textContent = 'Reading workbook locally in this browser…';
      const buffer = await file.arrayBuffer();
      workbook = XLSX.read(buffer, {type:'array', cellDates:true});
      workbook.SheetNames.forEach(name => {
        const option = document.createElement('option'); option.value = name; option.textContent = name; sheetSelect.appendChild(option);
      });
      const preferred = workbook.SheetNames.find(name => normalize(name) === '2027 NEP') || workbook.SheetNames.find(name => normalize(name) === '2027 RO PROJECTS') || workbook.SheetNames[0];
      sheetSelect.value = preferred;
      sheetSelect.disabled = false;
      loadButton.disabled = false;
      fileStatus.textContent = `Ready: ${file.name} · ${workbook.SheetNames.length} worksheets. Workbook content stays in this browser tab.`;
    } catch (error) {
      fileStatus.textContent = 'Could not read this workbook. Check that it is a valid Excel file and try again.';
      console.error('Workbook parse error', error);
    }
  });


loadButton.addEventListener('click', () => {
  try {
    if (!workbook) {
      throw new Error('Please select a valid Excel workbook first.');
    }

    const name = sheetSelect.value;
    const sheet = workbook.Sheets[name];

    if (!sheet) {
      throw new Error('Choose a valid worksheet.');
    }

    const matrix = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: true,
      blankrows: false
    });

    const headerRow = Math.max(
      1,
      Number($('headerRow').value) || 6
    );

    const headers = matrix[headerRow - 1] || [];

    if (!headers.some(value => text(value))) {
      throw new Error(
        `No headers found on row ${headerRow}. ` +
        'Check the header row number.'
      );
    }

    const titleIdx = findIndex(headers, [
      'PROJECT TITLE AS PER NEP',
      'PROJECT TITLE AS PER GAA',
      'PROJECT TITLE AS PER GAB',
      'PROJECT TITLE'
    ]);

    const allocationIdx = findIndex(headers, [
      'ALLOCATION',
      'ALLOCATION1',
      'ALLOCATION4',
      'ALLOCATION43'
    ]);

    if (titleIdx < 0 || allocationIdx < 0) {
      throw new Error(
        'Required project-title or allocation column not found. ' +
        'Select the correct worksheet and header row.'
      );
    }

    currentHeaders = headers;

    currentRows = matrix
      .slice(headerRow)
      .map((row, i) => ({
        row,
        excelRow: headerRow + i + 1
      }))
      .filter(item => item.row.some(value => text(value)))
      .map(item => {
        const row = item.row;

        return {
          excelRow: item.excelRow,
          projectTitle: text(cell(row, headers, [
            'PROJECT TITLE AS PER GAA',
            'PROJECT TITLE AS PER GAB',
            'PROJECT TITLE AS PER NEP',
            'PROJECT TITLE'
          ])),
          municipality: text(cell(row, headers, [
            'MUNICIPALITY3',
            'MUNICIPALITY2',
            'MUNICIPALITY'
          ])),
          allocation: money(cell(row, headers, [
            'ALLOCATION',
            'ALLOCATION43',
            'ALLOCATION1',
            'ALLOCATION4'
          ])),
          procurement: text(cell(row, headers, [
            'PROCUREMENT STATUS'
          ])),
          contractStatus: text(cell(row, headers, [
            'STATUS OF CONTRACT'
          ])),
          contractId: text(cell(row, headers, ['CONTRACT ID'])),
          program: text(cell(row, headers, ['PROGRAM2', 'PROGRAM'])),
          plan: text(cell(row, headers, ['PLAN'])),
          saro: text(cell(row, headers, ['SARO UPDATE'])),
          category: text(cell(row, headers, ['CATEGORY', 'CATEGORY2'])),
          searchText: row.map(text).join(' ').toLowerCase()
        };
      })
      .filter(project => project.projectTitle || project.contractId);

    populateStatuses();
    $('searchProjects').value = '';
    $('statusFilter').value = '';
    $('dashboard').hidden = false;

    render();

    fileStatus.textContent =
      `Loaded ${currentRows.length.toLocaleString()} project rows ` +
      `from "${name}", header row ${headerRow}.`;

  } catch (error) {
    console.error('Dashboard loading error:', error);

    $('dashboard').hidden = true;

    fileStatus.textContent =
      'Dashboard could not load: ' +
      (error.message || 'Unexpected error. Check the browser console.');
  }
});


  function populateStatuses() {
    const select = $('statusFilter');
    const statuses = [...new Set(currentRows.map(row => row.procurement).filter(Boolean))].sort((a,b) => a.localeCompare(b));
    select.innerHTML = '<option value="">All statuses</option>';
    statuses.forEach(status => { const option = document.createElement('option'); option.value = status; option.textContent = status; select.appendChild(option); });
  }
  function render() {
    const query = $('searchProjects').value.trim().toLowerCase();
    const status = $('statusFilter').value;
    const filtered = currentRows.filter(project => (!query || project.searchText.includes(query)) && (!status || project.procurement === status));
    $('totalProjects').textContent = filtered.length.toLocaleString();
    $('totalAllocation').textContent = formatMoney(filtered.reduce((sum, project) => sum + project.allocation, 0));
    $('withSaro').textContent = filtered.filter(project => project.saro).length.toLocaleString();
    $('statusCount').textContent = new Set(filtered.map(project => project.procurement).filter(Boolean)).size.toLocaleString();
    $('tableInfo').textContent = `Showing ${filtered.length.toLocaleString()} of ${currentRows.length.toLocaleString()} project records. Amounts reflect the selected worksheet columns; verify which allocation column your office uses.`;
    const tbody = $('projectRows');
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty">No projects match the selected filters.</td></tr>'; return; }
    tbody.innerHTML = filtered.map(project => `<tr><td>${escapeHtml(project.projectTitle || '—')}</td><td>${escapeHtml(project.municipality || '—')}</td><td>${escapeHtml(formatMoney(project.allocation))}</td><td>${escapeHtml(project.procurement || '—')}</td><td>${escapeHtml(project.contractStatus || '—')}</td><td>${escapeHtml(project.contractId || '—')}</td><td>${escapeHtml(project.program || '—')}</td><td>${escapeHtml(project.plan || '—')}</td><td>${escapeHtml(project.saro || '—')}</td></tr>`).join('');
  }
  $('searchProjects').addEventListener('input', render);
  $('statusFilter').addEventListener('change', render);
})();
