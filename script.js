document.addEventListener('DOMContentLoaded', function () {
    const grid = GridStack.init({
        column: 24,
        float: true,
        cellHeight: '70px',
        minRow: 1,
        margin: 12,
    });

    const welcomeMessageEl = document.getElementById('welcome-message');
    const addWidgetBtn = document.getElementById('add-widget-btn');
    const linkModal = document.getElementById('link-modal');
    const linkForm = document.getElementById('link-form');
    const editWidgetModal = document.getElementById('edit-widget-modal');
    const editWidgetForm = document.getElementById('edit-widget-form');
    const optionsBtn = document.getElementById('options-btn');
    const optionsDropdown = document.getElementById('options-dropdown');
    const importBtn = document.getElementById('import-btn');
    const exportBtn = document.getElementById('export-btn');
    const importFileInput = document.getElementById('import-file-input');
    const confirmModal = document.getElementById('confirm-modal');
    const confirmModalText = document.getElementById('confirm-modal-text');
    const confirmOkBtn = document.getElementById('confirm-modal-ok-btn');
    const confirmCancelBtn = document.getElementById('confirm-modal-cancel-btn');
    const nameModal = document.getElementById('name-modal');
    const nameForm = document.getElementById('name-form');
    let widgets = [];
    let userName = '';

    const showConfirmModal = (text) => {
        return new Promise((resolve) => {
            confirmModalText.textContent = text;
            confirmModal.style.display = 'flex';

            const onOk = () => {
                confirmModal.style.display = 'none';
                confirmOkBtn.removeEventListener('click', onOk);
                confirmCancelBtn.removeEventListener('click', onCancel);
                resolve(true);
            };

            const onCancel = () => {
                confirmModal.style.display = 'none';
                confirmOkBtn.removeEventListener('click', onOk);
                confirmCancelBtn.removeEventListener('click', onCancel);
                resolve(false);
            };

            confirmOkBtn.addEventListener('click', onOk);
            confirmCancelBtn.addEventListener('click', onCancel);
        });
    };

    const showNameModal = (currentName = "") => {
        return new Promise((resolve) => {
            const nameInput = nameForm.querySelector('#name-input');
            const nameCancelBtn = nameForm.querySelector('#name-modal-cancel-btn');
            nameInput.value = currentName;
            nameModal.style.display = 'flex';
            nameInput.focus();

            const onSubmit = (event) => {
                event.preventDefault();
                const newName = nameInput.value.trim();
                nameModal.style.display = 'none';
                nameForm.removeEventListener('submit', onSubmit);
                nameCancelBtn.removeEventListener('click', onCancel);
                resolve(newName || null);
            };

            const onCancel = () => {
                nameModal.style.display = 'none';
                nameForm.removeEventListener('submit', onSubmit);
                nameCancelBtn.removeEventListener('click', onCancel);
                resolve(null);
            };

            nameForm.addEventListener('submit', onSubmit);
            nameCancelBtn.addEventListener('click', onCancel);
        });
    };

    const saveWidgetsData = () => {
        chrome.storage.local.set({ widgets: widgets }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error saving widget data:', chrome.runtime.lastError);
            }
        });
    };

    const saveLayoutData = () => {
        const layout = grid.save(false);
        chrome.storage.local.set({ dashboardLayout: layout }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error saving layout.', chrome.runtime.lastError);
            }
        });
    };
    
    const loadData = () => {
        chrome.storage.local.get(['widgets', 'dashboardLayout', 'userName'], (data) => {
            if (chrome.runtime.lastError) { console.error('Error loading data.', chrome.runtime.lastError); return; }
            
            userName = data.userName || '';
            setupWelcomeMessage();

            grid.batchUpdate();
            if (data.widgets && Array.isArray(data.widgets)) {
                widgets = data.widgets;
                renderAllWidgets();
            }
            if (data.dashboardLayout) {
                const cleanLayout = data.dashboardLayout.filter(layoutItem => widgets.some(widget => widget.id === layoutItem.id));
                grid.load(cleanLayout);
            }
            grid.commit();
        });
    };

    const renderAllWidgets = () => {
        grid.removeAll(false);
        widgets.forEach(widgetData => {
            const el = document.createElement('div');
            el.setAttribute('gs-id', widgetData.id);
            el.setAttribute('gs-x', widgetData.x);
            el.setAttribute('gs-y', widgetData.y);
            el.setAttribute('gs-w', widgetData.w);
            el.setAttribute('gs-h', widgetData.h);
            grid.addWidget(el);
            renderWidgetContent(el, widgetData);
        });
    };

    const renderWidgetContent = (el, widgetData) => {
        const content = document.createElement('div');
        content.className = 'grid-stack-item-content';
        const editIconHTML = `<span class="material-symbols-outlined">design_services</span>`;
        const deleteIconHTML = `<span class="material-symbols-outlined">delete</span>`;
        const addIconHTML = `<span class="material-symbols-outlined">add</span>`;
        const widgetIcon = widgetData.icon || 'link';
        content.innerHTML = `
            <div class="widget-header">
                <h3 class="widget-title">
                    <span class="material-symbols-outlined widget-icon">${widgetIcon}</span>
                    <span class="widget-title-text">${widgetData.title}</span>
                </h3>
                <div class="header-buttons">
                    <button class="icon-btn add-link-btn" title="Add new link">${addIconHTML}</button>    
                     <button class="icon-btn edit-widget-btn" title="Edit title and icon">${editIconHTML}</button>
                    <button class="icon-btn delete-widget-btn" title="Delete widget">${deleteIconHTML}</button>
                </div>
            </div>
            <ul class="widget-content links-list"></ul>`;
        el.appendChild(content);
        content.querySelector('.edit-widget-btn').addEventListener('click', () => openEditWidgetModal(widgetData.id));
        content.querySelector('.add-link-btn').addEventListener('click', () => openLinkModal(widgetData.id));
        content.querySelector('.delete-widget-btn').addEventListener('click', () => deleteWidget(widgetData.id));
        renderLinksForWidget(el, widgetData);
    };

    const renderLinksForWidget = (widgetEl, widgetData) => {
        const linksList = widgetEl.querySelector('.links-list');
        if (!linksList) return;
        const editIconHTML = `<span class="material-symbols-outlined">design_services</span>`;
        const deleteIconHTML = `<span class="material-symbols-outlined">delete</span>`;
        linksList.innerHTML = '';
        (widgetData.links || []).forEach(link => {
            const linkIcon = link.icon || 'link';
            const linkIconHTML = `<div class="link-icon"><span class="material-symbols-outlined">${linkIcon}</span></div>`;
            const li = document.createElement('li');
            li.innerHTML = `
                <a href="${link.url}">${linkIconHTML} <span class="link-icon-text">${link.title}</span></a>
                <div class="link-actions">
                    <button class="icon-btn edit-link-btn" title="Edit link">${editIconHTML}</button>
                    <button class="icon-btn delete-link-btn" title="Delete link">${deleteIconHTML}</button>
                </div>`;
            li.querySelector('.edit-link-btn').addEventListener('click', (e) => { e.preventDefault(); openLinkModal(widgetData.id, link.id); });
            li.querySelector('.delete-link-btn').addEventListener('click', (e) => { e.preventDefault(); deleteLink(widgetData.id, link.id); });
            linksList.appendChild(li);
        });
    };

    const addNewWidget = () => {
        const newWidget = { id: `widget-${Date.now()}`, title: 'New Widget', icon: 'article', links: [], w: 4, h: 5 };
        widgets.push(newWidget);
        saveWidgetsData();
        const el = document.createElement('div');
        el.setAttribute('gs-id', newWidget.id);
        grid.addWidget(el, newWidget);
        renderWidgetContent(el, newWidget);
        saveLayoutData();
    };
    
    const deleteWidget = async (widgetId) => {
        const widget = widgets.find(w => w.id === widgetId);
        if (!widget) return;

        const confirmed = await showConfirmModal(`Are you sure you want to delete the widget "${widget.title}"?`);
        
        if (confirmed) {
            widgets = widgets.filter(w => w.id !== widgetId);
            saveWidgetsData();
            
            const el = grid.getGridItems().find(item => item.getAttribute('gs-id') === widgetId);
            if (el) {
                grid.removeWidget(el);
            }
            saveLayoutData();
        }
    };

    const openEditWidgetModal = (widgetId) => {
        const widget = widgets.find(w => w.id === widgetId);
        if (!widget) return;
        editWidgetForm.querySelector('#edit-widget-id').value = widgetId;
        editWidgetForm.querySelector('#widget-title-input').value = widget.title;
        editWidgetForm.querySelector('#widget-icon-input').value = widget.icon || 'link';
        editWidgetModal.style.display = 'flex';
        editWidgetForm.querySelector('#widget-title-input').focus();
    };

    editWidgetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const widgetId = editWidgetForm.querySelector('#edit-widget-id').value;
        const widget = widgets.find(w => w.id === widgetId);
        if (widget) {
            widget.title = editWidgetForm.querySelector('#widget-title-input').value;
            widget.icon = editWidgetForm.querySelector('#widget-icon-input').value.trim().toLowerCase();
            const widgetEl = grid.getGridItems().find(item => item.getAttribute('gs-id') === widgetId);
            if (widgetEl) {
                widgetEl.querySelector('.widget-title-text').textContent = widget.title;
                widgetEl.querySelector('.widget-icon').textContent = widget.icon;
            }
            saveWidgetsData();
        }
        editWidgetModal.style.display = 'none';
    });

    const openLinkModal = (widgetId, linkId = null) => {
        linkForm.reset();
        linkForm.querySelector('#link-widget-id').value = widgetId;
        const modalTitle = linkModal.querySelector('#modal-title');
        const linkIconInput = linkForm.querySelector('#link-icon-input');
        const widget = widgets.find(w => w.id === widgetId);
        if (!widget) return;
        if (linkId) {
            modalTitle.textContent = 'Edit Link';
            const link = (widget.links || []).find(l => l.id === linkId);
            if (link) {
                linkForm.querySelector('#link-id').value = linkId;
                linkForm.querySelector('#link-title').value = link.title;
                linkForm.querySelector('#link-url').value = link.url;
                linkIconInput.value = link.icon || 'link';
            }
        } else {
            modalTitle.textContent = 'Add Link';
            linkForm.querySelector('#link-id').value = '';
            linkIconInput.value = 'link';
        }
        linkModal.style.display = 'flex';
    };

    linkForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const widgetId = linkForm.querySelector('#link-widget-id').value;
        const linkId = linkForm.querySelector('#link-id').value;
        const widget = widgets.find(w => w.id === widgetId);
        if (!widget) return;
        if (!widget.links) widget.links = [];
        const title = linkForm.querySelector('#link-title').value;
        const url = linkForm.querySelector('#link-url').value;
        const icon = linkForm.querySelector('#link-icon-input').value.trim().toLowerCase() || 'link';
        if (linkId) {
            const link = widget.links.find(l => l.id === linkId);
            if (link) { link.title = title; link.url = url; link.icon = icon; }
        } else {
            const newLink = { id: `link-${Date.now()}`, title, url, icon };
            widget.links.push(newLink);
        }
        const widgetEl = grid.getGridItems().find(item => item.getAttribute('gs-id') === widgetId);
        renderLinksForWidget(widgetEl, widget);
        saveWidgetsData();
        linkModal.style.display = 'none';
    });

    const deleteLink = (widgetId, linkId) => {
        const widget = widgets.find(w => w.id === widgetId);
        if (!widget) return;
        widget.links = (widget.links || []).filter(l => l.id !== linkId);
        const widgetEl = grid.getGridItems().find(item => item.getAttribute('gs-id') === widgetId);
        renderLinksForWidget(widgetEl, widget);
        saveWidgetsData();
    };
    
    const setupWelcomeMessage = () => {
        const displayWelcomeMessage = (name) => {
            welcomeMessageEl.textContent = name ? `Welcome, ${name}.` : 'Welcome.';
        };
        
        displayWelcomeMessage(userName);

        if (!userName) {
            setTimeout(async () => {
                const newName = await showNameModal();
                if (newName) {
                    userName = newName;
                    chrome.storage.local.set({ userName: userName });
                    displayWelcomeMessage(userName);
                }
            }, 500);
        }

        welcomeMessageEl.addEventListener('click', async () => {
            const newName = await showNameModal(userName);
            if (newName) {
                userName = newName;
                chrome.storage.local.set({ userName: newName });
                displayWelcomeMessage(userName);
            }
        });
    };
    
    optionsBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        optionsDropdown.classList.toggle('show');
    });
    window.addEventListener('click', () => {
        if (optionsDropdown.classList.contains('show')) {
            optionsDropdown.classList.remove('show');
        }
    });
    exportBtn.addEventListener('click', () => {
        const layout = grid.save(false);
        const dataToSave = {
            userName: userName,
            widgets: widgets,
            dashboardLayout: layout
        };
        const dataStr = JSON.stringify(dataToSave, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        optionsDropdown.classList.remove('show');
    });
    importBtn.addEventListener('click', () => {
        importFileInput.click();
        optionsDropdown.classList.remove('show');
    });
    importFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                if (!importedData.widgets || !Array.isArray(importedData.widgets)) {
                    throw new Error('Invalid backup file.');
                }

                const confirmed = await showConfirmModal('Are you sure? Importing a backup will replace your entire current configuration.');
                
                if (!confirmed) {
                    importFileInput.value = '';
                    return;
                }
                
                chrome.storage.local.set({ 
                    widgets: importedData.widgets,
                    userName: importedData.userName || '',
                    dashboardLayout: importedData.dashboardLayout || []
                }, () => {
                    if (chrome.runtime.lastError) {
                        alert('Error importing backup: ' + chrome.runtime.lastError.message);
                    } else {
                        window.location.reload();
                    }
                });

            } catch (error) {
                alert('Failed to read backup file.\n\n' + error);
            }
            importFileInput.value = '';
        };
        reader.readAsText(file);
    });

    grid.on('dragstop', saveLayoutData);
    grid.on('resizestop', saveLayoutData);
    
    addWidgetBtn.addEventListener('click', addNewWidget);
    linkForm.querySelector('#cancel-btn').addEventListener('click', () => linkModal.style.display = 'none');
    editWidgetForm.querySelector('#edit-widget-cancel-btn').addEventListener('click', () => editWidgetModal.style.display = 'none');
    
    loadData();
});