let currentMonth = "Mar";
const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
let db = JSON.parse(localStorage.getItem('finance_db')) || {};

function init() {
    selectMonth(currentMonth);
}

function checkDefaultRows() {
    if (!db[currentMonth]) db[currentMonth] = { incomes: [], expenses: [] };
    if (db[currentMonth].incomes.length === 0 && db[currentMonth].expenses.length === 0) {
        for (let i = 0; i < 2; i++) db[currentMonth].incomes.push({ name: '', value: 0 });
        for (let i = 0; i < 8; i++) db[currentMonth].expenses.push({ desc: '', value: 0, date: '', status: 'Pendente' });
        save();
    }
}

function renderMonthButtons() {
    const nav = document.getElementById('month-selector');
    nav.innerHTML = months.map(m => `
        <button class="month-btn ${m === currentMonth ? 'active' : ''}" 
                onclick="selectMonth('${m}')">${m}</button>
    `).join('');
}

function selectMonth(m) {
    currentMonth = m;
    document.title = "Finanças - " + m;
    checkDefaultRows();
    renderMonthButtons();
    renderContent();
}

function renderContent() {
    const monthData = db[currentMonth];
    
    const incomeList = document.getElementById('income-list');
    incomeList.innerHTML = monthData.incomes.map((item, i) => `
        <div class="income-item">
            <input type="text" class="income-label" value="Renda ${i + 1}" readonly>
            <input type="text" placeholder="Nome (Ex: Salário)" value="${item.name || ''}" oninput="update('incomes', ${i}, 'name', this.value)">
            <input type="number" placeholder="0,00" value="${item.value || ''}" oninput="update('incomes', ${i}, 'value', this.value)">
        </div>
    `).join('');

    const expenseList = document.getElementById('expense-list');
    expenseList.innerHTML = monthData.expenses.map((item, i) => {
        const statusClass = item.status === 'Pago' ? 'status-pago' : 'status-pendente';
        return `
        <tr>
            <td><input type="text" placeholder="Descrição" value="${item.desc || ''}" oninput="update('expenses', ${i}, 'desc', this.value)"></td>
            <td><input type="number" placeholder="0,00" value="${item.value || ''}" oninput="update('expenses', ${i}, 'value', this.value)"></td>
            <td><input type="date" value="${item.date || ''}" oninput="update('expenses', ${i}, 'date', this.value)"></td>
            <td>
                <select class="status-select ${statusClass}" onchange="update('expenses', ${i}, 'status', this.value)">
                    <option value="Pendente" ${item.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="Pago" ${item.status === 'Pago' ? 'selected' : ''}>Pago</option>
                </select>
            </td>
            <td class="col-fix">
                <div class="btn-group-fix">
                    <button class="btn-fix" onclick="fixExpense(${i})">📌</button>
                    <button class="btn-fix btn-unfix" onclick="unfixExpense(${i})">🧹</button>
                </div>
            </td>
        </tr>
    `}).join('');
    calculate();
}

function update(type, index, field, value) {
    db[currentMonth][type][index][field] = value;
    save();
    if (field === 'status') renderContent();
    else calculate();
}

function calculate() {
    const m = db[currentMonth];
    const totalInc = m.incomes.reduce((acc, c) => acc + Number(c.value || 0), 0);
    const totalExp = m.expenses.reduce((acc, c) => acc + Number(c.value || 0), 0);
    const totalPend = m.expenses.filter(e => e.status === 'Pendente').reduce((acc, c) => acc + Number(c.value || 0), 0);
    const saldo = totalInc - totalExp;
    const perc = totalInc > 0 ? (totalExp / totalInc) * 100 : 0;

    document.getElementById('total-receitas').innerText = formatCurrency(totalInc);
    document.getElementById('total-gastos').innerText = formatCurrency(totalExp);
    document.getElementById('total-pendente').innerText = formatCurrency(totalPend);
    document.getElementById('perc-comprometimento').innerText = perc.toFixed(1) + '%';
    document.getElementById('progress-fill').style.width = Math.min(perc, 100) + '%';

    const saldoElement = document.getElementById('saldo-geral');
    saldoElement.innerText = formatCurrency(saldo);
    saldoElement.className = saldo < 0 ? 'saldo-negativo' : 'saldo-positivo';

    calculateAnnual();
}

function calculateAnnual() {
    let annualInc = 0;
    let annualExp = 0;
    months.forEach(m => {
        if (db[m]) {
            annualInc += db[m].incomes.reduce((acc, c) => acc + Number(c.value || 0), 0);
            annualExp += db[m].expenses.reduce((acc, c) => acc + Number(c.value || 0), 0);
        }
    });
    const balance = annualInc - annualExp;
    document.getElementById('annual-income').innerText = formatCurrency(annualInc);
    document.getElementById('annual-expense').innerText = formatCurrency(annualExp);
    const balEl = document.getElementById('annual-balance');
    balEl.innerText = formatCurrency(balance);
    balEl.className = balance >= 0 ? 'positivo' : 'negativo';
}

function fixExpense(index) {
    const expenseToFix = db[currentMonth].expenses[index];
    if (!expenseToFix.desc || !expenseToFix.value) {
        alert("Preencha descrição e valor!"); return;
    }
    if (confirm(`Fixar "${expenseToFix.desc}" em todos os meses?`)) {
        months.forEach(m => {
            if (!db[m]) db[m] = { incomes: [], expenses: [] };
            while (db[m].expenses.length <= index) db[m].expenses.push({ desc: '', value: 0, date: '', status: 'Pendente' });
            db[m].expenses[index] = { desc: expenseToFix.desc, value: expenseToFix.value, date: '', status: 'Pendente' };
        });
        save();
        alert("Fixado!");
        calculateAnnual();
    }
}

function unfixExpense(index) {
    const exp = db[currentMonth].expenses[index];
    if (confirm(`Limpar "${exp.desc || 'linha'}" de todos os outros meses?`)) {
        months.forEach(m => {
            if (m !== currentMonth && db[m] && db[m].expenses[index]) {
                db[m].expenses[index] = { desc: '', value: 0, date: '', status: 'Pendente' };
            }
        });
        save();
        alert("Limpo!");
        calculateAnnual();
    }
}

function addRow(type) {
    const newItem = type === 'incomes' ? { name: '', value: 0 } : { desc: '', value: 0, date: '', status: 'Pendente' };
    db[currentMonth][type].push(newItem);
    renderContent();
    save();
}

function removeRow(type) {
    if (db[currentMonth][type].length > 0) {
        db[currentMonth][type].pop();
        renderContent();
        save();
    }
}

function formatCurrency(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function save() { localStorage.setItem('finance_db', JSON.stringify(db)); }

function clearMonth() {
    if(confirm("Deseja resetar os dados de " + currentMonth + "?")) {
        delete db[currentMonth];
        checkDefaultRows();
        renderContent();
    }
}

function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `financeiro.json`);
    a.click();
}

function importData(event) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            db = JSON.parse(e.target.result);
            save();
            renderContent();
            alert("Backup importado!");
        } catch (err) { alert("Erro ao importar."); }
    };
    reader.readAsText(event.target.files[0]);
}

init();
