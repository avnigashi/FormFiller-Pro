// Set to store elements that have been prefilled
const prefilledElements = new WeakSet();

function prefillInputs() {
  chrome.storage.sync.get(['prefillRules', 'isExtensionEnabled'], function(data) {
    const prefillRules = data.prefillRules || [];
    const isExtensionEnabled = data.isExtensionEnabled !== undefined ? data.isExtensionEnabled : true;
    
    if (!isExtensionEnabled) return;

    prefillRules.forEach(function(rule) {
      const elements = document.querySelectorAll(rule.selector);
      elements.forEach(function(element) {
        if ((element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') && !prefilledElements.has(element)) {
          element.value = rule.value;
          // Dispatch input event to trigger any listeners
          const event = new Event('input', { bubbles: true });
          element.dispatchEvent(event);
          
          // Mark this element as prefilled
          prefilledElements.add(element);
          
          // Add event listener to remove from prefilledElements if user changes the value
          element.addEventListener('input', function() {
            prefilledElements.delete(element);
          }, { once: true });
        }
      });
    });
  });
}

function getCurrentInputs() {
  const inputs = [];
  const elements = document.querySelectorAll('input, textarea');
  elements.forEach(function(element) {
    if (element.value) {
      inputs.push({
        selector: generateUniqueSelector(element),
        value: element.value
      });
    }
  });
  return inputs;
}

function generateUniqueSelector(element) {
  if (element.id) {
    return '#' + element.id;
  }
  if (element.name) {
    return element.tagName.toLowerCase() + '[name="' + element.name + '"]';
  }
  var path = [];
  while (element.parentNode !== document) {
    var sibling = element;
    var siblingIndex = 1;
    while (sibling = sibling.previousElementSibling) {
      if (sibling.nodeName === element.nodeName) {
        siblingIndex++;
      }
    }
    path.unshift(element.nodeName.toLowerCase() + ':nth-of-type(' + siblingIndex + ')');
    element = element.parentNode;
  }
  return path.join(' > ');
}

// Run the prefill function when the page loads
prefillInputs();

// Listen for changes to the DOM and run the prefill function again
const observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          prefillInputs();
        }
      });
    }
  });
});
observer.observe(document.body, { childList: true, subtree: true });

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getCurrentInputs") {
    sendResponse({inputs: getCurrentInputs()});
  }
});
