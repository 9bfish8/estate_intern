class DataService {
  constructor(data) {
      this.originalData = [...data];
      this.data = [...data];
      this.sortColumn = null;
      this.sortDirection = "asc";
      this.searchTerm = "";
  }

  search(term) {
      this.searchTerm = term.toLowerCase();

      if (this.searchTerm === "") {
          this.data = [...this.originalData];
          return this.data;
      }

      this.data = this.originalData.filter(row => {
          return Object.values(row).some(value => {
              const strValue = value.toString().toLowerCase();
              if (strValue.startsWith("$")) {
                  const numericValue = strValue.replace(/[$,]/g, "");
                  const numericSearch = this.searchTerm.replace(/[$,]/g, "");
                  return numericValue.includes(numericSearch);
              }
              return strValue.includes(this.searchTerm);
          });
      });

      return this.data;
  }

  sort(column) {
      if (this.sortColumn === column) {
          this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
      } else {
          this.sortColumn = column;
          this.sortDirection = "asc";
      }

      this.data.sort((a, b) => {
          let aVal = a[column];
          let bVal = b[column];

          if (column === "salary") {
              aVal = parseInt(aVal.replace(/[$,]/g, ""));
              bVal = parseInt(bVal.replace(/[$,]/g, ""));
              return this.sortDirection === "asc" ? aVal - bVal : bVal - aVal;
          }

          return this.sortDirection === "asc"
              ? aVal.toString().localeCompare(bVal.toString())
              : bVal.toString().localeCompare(aVal.toString());
      });

      return {
          column: this.sortColumn,
          direction: this.sortDirection
      };
  }

  delete(indexes) {
      indexes.sort((a, b) => b - a).forEach(index => {
          this.data.splice(index, 1);
      });
      this.originalData = [...this.data];
      return this.data;
  }

  add(newData) {
      this.data.push(newData);
      this.originalData.push(newData);
      return this.data;
  }

  getPaginatedData(page, rowsPerPage) {
      const start = (page - 1) * rowsPerPage;
      const end = rowsPerPage === -1 ? this.data.length : start + rowsPerPage;
      return this.data.slice(start, end);
  }

  getTotalPages(rowsPerPage) {
      return rowsPerPage === -1 ? 1 : Math.ceil(this.data.length / rowsPerPage);
  }

  calculateTotal() {
      return this.data.reduce((sum, row) => {
          return sum + parseInt(row.salary.replace(/[$,]/g, ""));
      }, 0);
  }

  getDataLength() {
      return this.data.length;
  }
}

class TableUI {
  constructor(tableId, dataService) {
      this.table = document.getElementById(tableId);
      this.dataService = dataService;
      this.currentPage = 1;
      this.rowsPerPage = 10;
      this.selectedRows = new Set();
      this.modal = new bootstrap.Modal(document.getElementById("dataModal"));
      
      this.init();
  }

  init() {
      this.setupEventListeners();
      this.renderTable();
      this.updatePagination();
      this.updateTotal();
  }

  setupEventListeners() {
      // 정렬 이벤트
      document.querySelectorAll('th[data-sort]').forEach(th => {
          th.addEventListener('click', () => {
              const { column, direction } = this.dataService.sort(th.dataset.sort);
              this.updateSortIcons(column, direction);
              this.renderTable();
          });
      });

      // 검색 이벤트
      document.getElementById("searchInput").addEventListener("input", 
          this.debounce(e => {
              this.dataService.search(e.target.value);
              this.currentPage = 1;
              this.renderTable();
              this.updatePagination();
          }, 300)
      );

      // 페이지당 행 수 변경
      document.getElementById("rowsPerPage").addEventListener("change", e => {
          this.rowsPerPage = parseInt(e.target.value);
          this.currentPage = 1;
          this.renderTable();
          this.updatePagination();
      });

      // 페이지네이션 버튼
      document.getElementById("prevPage").addEventListener("click", () => this.goToPage(this.currentPage - 1));
      document.getElementById("nextPage").addEventListener("click", () => this.goToPage(this.currentPage + 1));

      // 행 선택 이벤트
      this.table.querySelector("tbody").addEventListener("click", e => {
          const tr = e.target.closest("tr");
          if (tr) {
              const index = parseInt(tr.dataset.index);
              this.toggleRowSelection(tr, index);
          }
      });

      // CRUD 버튼 이벤트
      document.getElementById("addBtn").addEventListener("click", () => {
          document.getElementById("dataForm").reset();
          this.modal.show();
      });

      document.getElementById("deleteBtn").addEventListener("click", () => this.handleDelete());
      document.getElementById("saveBtn").addEventListener("click", () => this.handleSave());
  }

  debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
          const later = () => {
              clearTimeout(timeout);
              func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
      };
  }

  updateSortIcons(column, direction) {
      const headers = this.table.querySelectorAll("th[data-sort]");
      headers.forEach(header => {
          const icon = header.querySelector("i");
          if (header.dataset.sort === column) {
              icon.className = `fas fa-sort-${direction === "asc" ? "up" : "down"}`;
          } else {
              icon.className = "fas fa-sort";
          }
      });
  }

  formatSalary(salary) {
      const num = parseInt(salary.replace(/[$,]/g, ""));
      return `$${num.toLocaleString()}`;
  }

  renderTable() {
    const start = (this.currentPage - 1) * this.rowsPerPage;
    const data = this.dataService.getPaginatedData(this.currentPage, this.rowsPerPage);
    
    const rows = data.map((row, i) => {
        const index = start + i;
        const selectedClass = this.selectedRows.has(index) ? 'selected' : '';
        return `
            <tr data-index="${index}" class="${selectedClass}">
                <td>${row.name}</td>
                <td>${row.company}</td>
                <td>${row.job}</td>
                <td>${row.country}</td>
                <td>${row.email}</td>
                <td>${this.formatSalary(row.salary)}</td>
            </tr>
        `;
    }).join('');

    this.table.querySelector("tbody").innerHTML = rows;
    this.updateTotal();
}

  updateTotal() {
      const total = this.dataService.calculateTotal();
      document.getElementById("totalSalary").textContent = this.formatSalary(total.toString());
  }

  updatePagination() {
      const totalPages = this.dataService.getTotalPages(this.rowsPerPage);
      const container = document.querySelector(".page-numbers");
      const info = document.querySelector(".page-info");
      const totalItems = this.dataService.getDataLength();

      // 페이지 정보 업데이트
      const start = Math.min((this.currentPage - 1) * this.rowsPerPage + 1, totalItems);
      const end = Math.min(start + this.rowsPerPage - 1, totalItems);
      info.textContent = `${start}-${end} / ${totalItems}개`;

      // 이전/다음 버튼 상태 업데이트
      document.getElementById("prevPage").disabled = this.currentPage === 1;
      document.getElementById("nextPage").disabled = this.currentPage === totalPages;

      // 페이지 번호 버튼 생성
      container.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
          const button = document.createElement('button');
          button.textContent = i;
          button.classList.add('pagination-btn');
          if (i === this.currentPage) {
              button.classList.add('active');
          }
          button.addEventListener('click', () => this.goToPage(i));
          container.appendChild(button);
      }
  }

  goToPage(page) {
      const totalPages = this.dataService.getTotalPages(this.rowsPerPage);
      if (page >= 1 && page <= totalPages) {
          this.currentPage = page;
          this.renderTable();
          this.updatePagination();
      }
  }

  toggleRowSelection(tr, index) {
    if (this.selectedRows.has(index)) {
        this.selectedRows.delete(index);
        tr.classList.remove('selected');
    } else {
        this.selectedRows.add(index);
        tr.classList.add('selected');
    }
}

  handleDelete() {
      if (this.selectedRows.size === 0) {
          alert('삭제할 행을 선택해주세요.');
          return;
      }

      if (confirm(`선택한 ${this.selectedRows.size}개의 행을 삭제하시겠습니까?`)) {
          this.dataService.delete(Array.from(this.selectedRows));
          this.selectedRows.clear();

          const maxPage = this.dataService.getTotalPages(this.rowsPerPage);
          if (this.currentPage > maxPage) {
              this.currentPage = maxPage || 1;
          }

          this.renderTable();
          this.updatePagination();
      }
  }

  handleSave() {
      const form = document.getElementById("dataForm");
   

      const formData = new FormData(form);
      const newData = Object.fromEntries(formData.entries());
      newData.salary = "$" + newData.salary;

      this.dataService.add(newData);
      this.renderTable();
      this.updatePagination();

      this.modal.hide();
      form.reset();
  }
}

// 초기화
document.addEventListener("DOMContentLoaded", () => {
  const dataService = new DataService(dummy);
  const tableUI = new TableUI("dataTable", dataService);
});