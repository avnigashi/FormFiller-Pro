let prefillRules = [];
let isExtensionEnabled = true;

function updatePrefillList() {
  const prefillList = document.getElementById('prefill-list');
  const searchTerm = document.getElementById('search').value.toLowerCase();
  prefillList.innerHTML = '';
  prefillRules.forEach((rule, index) => {
    if (rule.selector.toLowerCase().includes(searchTerm) || rule.value.toLowerCase().includes(searchTerm)) {
      const item = document.createElement('div');
      item.className = 'prefill-item';
      item.innerHTML = `
        <span>${rule.selector}: ${rule.value}</span>
        <button class="edit-btn" data-index="${index}">Edit</button>
        <button class="delete-btn" data-index="${index}">Delete</button>
      `;
      prefillList.appendChild(item);
    }
  });
}

function savePrefillRules() {
  chrome.storage.sync.set({prefillRules: prefillRules, isExtensionEnabled: isExtensionEnabled}, function() {
    console.log('Prefill rules and extension state saved');
  });
}

function addRule(selector, value) {
  const existingRule = prefillRules.find(rule => rule.selector === selector);
  if (existingRule) {
    existingRule.value = value;
  } else {
    prefillRules.push({selector, value});
  }
  updatePrefillList();
}

function validateInput(selector, value) {
  if (!selector || !value) {
    return "Both selector and value are required.";
  }
  try {
    document.querySelector(selector);
  } catch (e) {
    return "Invalid CSS selector.";
  }
  return null;
}

document.addEventListener('DOMContentLoaded', function() {
  const selectorInput = document.getElementById('selector');
  const valueInput = document.getElementById('value');
  const addButton = document.getElementById('add');
  const saveButton = document.getElementById('save');
  const clearButton = document.getElementById('clear');
  const saveCurrentButton = document.getElementById('save-current');
  const removeAllButton = document.getElementById('remove-all');
  const prefillList = document.getElementById('prefill-list');
  const errorMessage = document.getElementById('error-message');
  const toggleExtension = document.getElementById('toggle-extension');
  const toggleStatus = document.getElementById('toggle-status');
  const searchInput = document.getElementById('search');
  const exportButton = document.getElementById('export-rules');
  const importButton = document.getElementById('import-button');
  const importInput = document.getElementById('import-rules');

  chrome.storage.sync.get(['prefillRules', 'isExtensionEnabled'], function(data) {
    prefillRules = data.prefillRules || [];
    isExtensionEnabled = data.isExtensionEnabled !== undefined ? data.isExtensionEnabled : true;
    toggleExtension.checked = isExtensionEnabled;
    toggleStatus.textContent = isExtensionEnabled ? 'Extension Enabled' : 'Extension Disabled';
    updatePrefillList();
  });

  addButton.addEventListener('click', function() {
    const selector = selectorInput.value;
    const value = valueInput.value;
    const error = validateInput(selector, value);
    
    if (error) {
      errorMessage.textContent = error;
    } else {
      errorMessage.textContent = '';
      addRule(selector, value);
      selectorInput.value = '';
      valueInput.value = '';
    }
  });

  saveButton.addEventListener('click', savePrefillRules);

  clearButton.addEventListener('click', function() {
    prefillRules = [];
    updatePrefillList();
    savePrefillRules();
  });

  saveCurrentButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "getCurrentInputs"}, function(response) {
        if (response && response.inputs) {
          response.inputs.forEach(input => addRule(input.selector, input.value));
          savePrefillRules();
        }
      });
    });
  });

  removeAllButton.addEventListener('click', function() {
    prefillRules = [];
    updatePrefillList();
    savePrefillRules();
  });

  prefillList.addEventListener('click', function(e) {
    if (e.target.classList.contains('delete-btn')) {
      const index = e.target.getAttribute('data-index');
      prefillRules.splice(index, 1);
      updatePrefillList();
    } else if (e.target.classList.contains('edit-btn')) {
      const index = e.target.getAttribute('data-index');
      const rule = prefillRules[index];
      selectorInput.value = rule.selector;
      valueInput.value = rule.value;
      prefillRules.splice(index, 1);
      updatePrefillList();
    }
  });

  toggleExtension.addEventListener('change', function() {
    isExtensionEnabled = toggleExtension.checked;
    toggleStatus.textContent = isExtensionEnabled ? 'Extension Enabled' : 'Extension Disabled';
    savePrefillRules();
  });

  searchInput.addEventListener('input', updatePrefillList);

  exportButton.addEventListener('click', function() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(prefillRules));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "prefill_rules.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  });

  importButton.addEventListener('click', function() {
    importInput.click();
  });

  importInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const importedRules = JSON.parse(e.target.result);
          prefillRules = importedRules;
          updatePrefillList();
          savePrefillRules();
        } catch (error) {
          errorMessage.textContent = "Error importing rules. Please check the file format.";
        }
      };
      reader.readAsText(file);
    }
  });
});
