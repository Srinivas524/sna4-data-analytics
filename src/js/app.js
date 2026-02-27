(function () {
    'use strict';
    console.log('[SNA4] App loaded ✅');

    // Sidebar navigation
    document.querySelectorAll('.sna4-sidebar li').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.sna4-sidebar li').forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            item.classList.add('active');
            document.getElementById('page-' + item.dataset.page).classList.add('active');
        });
    });

    // Mock stats
    document.getElementById('stat-total').textContent = '142';
    document.getElementById('stat-pending').textContent = '38';
    document.getElementById('stat-completed').textContent = '96';
    document.getElementById('stat-flagged').textContent = '8';

    document.getElementById('btn-refresh')?.addEventListener('click', () => {
        alert('Refreshed!');
    });
})();
