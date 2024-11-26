class CustomDataTable {
  constructor(tableId, data) {
    this.table = document.getElementById(tableId);
    this.originalData = [...data];
    this.data = data;
    this.currentPage = 1;
    this.rowsPerPage = 10;
    this.sortColumn = null;
    this.sortDirection = "asc";
    this.selectedRows = new Set();
    this.searchTerm = "";
    this.modal = new bootstrap.Modal(document.getElementById("dataModal"));

    this.init();
  }

  // 초기화, 이벤트 설정 및 테이블 렌더링
  init() {
    this.setupEventListeners();
    this.renderTable();
    this.updatePagination();
    this.calculateTotal();
  }

  setupEventListeners() {
    // 정렬 이벤트
    this.table.querySelector("thead").addEventListener("click", (e) => {
      const th = e.target.closest("th");
      if (th && th.dataset.sort) {
        this.handleSort(th.dataset.sort);
      }
    });

    // 검색 이벤트
    document.getElementById("searchInput").addEventListener("input", (e) => {
      this.searchTerm = e.target.value;
      this.handleSearch();
    });

    // 페이지당 행 수 변경
    document.getElementById("rowsPerPage").addEventListener("change", (e) => {
      this.rowsPerPage = parseInt(e.target.value);
      this.currentPage = 1;
      this.renderTable();
      this.updatePagination();
    });

    // 행 클릭시 선택/해제
    this.table.querySelector("tbody").addEventListener("click", (e) => {
      const tr = e.target.closest("tr");
      if (tr) {
        const index = parseInt(tr.dataset.index);
        if (this.selectedRows.has(index)) {
          this.selectedRows.delete(index);
          tr.classList.remove("selected");
        } else {
          this.selectedRows.add(index);
          tr.classList.add("selected");
        }
      }
    });

    // 추가 버튼 클릭시 모달 표시
    document.getElementById("addBtn").addEventListener("click", () => {
      document.getElementById("dataForm").reset();
      this.modal.show();
    });

    // 삭제 버튼
    document.getElementById("deleteBtn").addEventListener("click", () => {
      this.handleDelete();
    });

    // 저장 버튼
    document.getElementById("saveBtn").addEventListener("click", () => {
      this.handleSave();
    });
  }

  // 정렬 처리
  handleSort(column) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortColumn = column;
      this.sortDirection = "asc";
    }

    this.updateSortIcons(column);

    // 데이터 정렬
    this.data.sort((a, b) => {
      let aVal = a[column];
      let bVal = b[column];

      // 연봉 컬럼은 숫자로 변환해서 정렬
      if (column === "salary") {
        aVal = parseInt(aVal.replace(/[$,]/g, ""));
        bVal = parseInt(bVal.replace(/[$,]/g, ""));
        return this.sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      // 문자열 비교
      return this.sortDirection === "asc"
        ? aVal.toString().localeCompare(bVal.toString())
        : bVal.toString().localeCompare(aVal.toString());
    });

    this.renderTable();
  }

  updateSortIcons(column) {
    const headers = this.table.querySelectorAll("th");
    headers.forEach((header) => {
      const icon = header.querySelector("i");
      if (header.dataset.sort === column) {
        icon.className = `fas fa-sort-${
          this.sortDirection === "asc" ? "up" : "down"
        }`;
      } else {
        icon.className = "fas fa-sort";
      }
    });
  }

  // 검색 처리
  handleSearch() {
    const searchTerm = this.searchTerm.toLowerCase();

    if (searchTerm === "") {
      this.data = [...this.originalData]; // 검색어가 없으면 원래 데이터 로드
    } else {
      // 검색어로 필터링
      this.data = this.originalData.filter((row) => {
        return Object.values(row).some((value) => {
          const strValue = value.toString().toLowerCase();
          if (strValue.startsWith("$")) {
            const numericValue = strValue.replace(/[$,]/g, "");
            const numericSearch = searchTerm.replace(/[$,]/g, "");
            return numericValue.includes(numericSearch);
          }
          return strValue.includes(searchTerm);
        });
      });
    }

    this.currentPage = 1; // 첫페이지로 이동
    this.renderTable();
    this.updatePagination();
  }

  formatSalary(salary) {
    const num = parseInt(salary.replace(/[$,]/g, ""));
    return `$${num.toLocaleString()}`;
  }

  calculateTotal() {
    const total = this.data.reduce((sum, row) => {
      return sum + parseInt(row.salary.replace(/[$,]/g, ""));
    }, 0);
    document.getElementById("totalSalary").textContent = this.formatSalary(
      total.toString()
    );
  }

  // 테이블 렌더링
  renderTable() {
    const tbody = this.table.querySelector("tbody");
    tbody.innerHTML = "";

    const start = (this.currentPage - 1) * this.rowsPerPage;
    const end =
      this.rowsPerPage === -1 ? this.data.length : start + this.rowsPerPage;
    const paginatedData = this.data.slice(start, end);

    paginatedData.forEach((row, index) => {
      const tr = document.createElement("tr");
      const dataIndex = start + index;
      tr.dataset.index = dataIndex;

      // 선택된 행 표시
      if (this.selectedRows.has(dataIndex)) {
        tr.classList.add("selected");
      }

      // 행 내용
      tr.innerHTML = `
        <td>${row.name}</td>
        <td>${row.company}</td>
        <td>${row.job}</td>
        <td>${row.country}</td>
        <td>${row.email}</td>
        <td>${this.formatSalary(row.salary)}</td>
      `;
      tbody.appendChild(tr);
    });

    this.calculateTotal();
  }

  updatePagination() {
    const totalPages =
      this.rowsPerPage === -1
        ? 1
        : Math.ceil(this.data.length / this.rowsPerPage);
    const container = document.querySelector(".page-numbers");
    const info = document.querySelector(".page-info");

    const start = (this.currentPage - 1) * this.rowsPerPage + 1;
    const end = Math.min(start + this.rowsPerPage - 1, this.data.length);
    info.textContent = `${start}-${end} / ${this.data.length}개`;

    container.innerHTML = "";
    if (totalPages > 1) {
      if (this.currentPage > 1) {
        const prevBtn = document.createElement("button");
        prevBtn.textContent = "이전";
        prevBtn.addEventListener("click", () =>
          this.goToPage(this.currentPage - 1)
        );
        container.appendChild(prevBtn);
      }

      for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement("button");
        button.textContent = i;
        if (i === this.currentPage) {
          button.classList.add("active");
        }
        button.addEventListener("click", () => this.goToPage(i));
        container.appendChild(button);
      }

      if (this.currentPage < totalPages) {
        const nextBtn = document.createElement("button");
        nextBtn.textContent = "다음";
        nextBtn.addEventListener("click", () =>
          this.goToPage(this.currentPage + 1)
        );
        container.appendChild(nextBtn);
      }
    }
  }

  goToPage(page) {
    this.currentPage = page;
    this.renderTable();
    this.updatePagination();
  }

  handleDelete() {
    if (this.selectedRows.size === 0) {
      alert("삭제할 행을 선택해주세요.");
      return;
    }

    if (
      confirm(`선택한 ${this.selectedRows.size}개의 행을 삭제하시겠습니까?`)
    ) {
      const selectedIndexes = Array.from(this.selectedRows).sort(
        (a, b) => b - a
      );

      selectedIndexes.forEach((index) => {
        this.data.splice(index, 1);
      });

      this.originalData = [...this.data];
      this.selectedRows.clear();

      // 페이지 번호 조정
      const maxPage = Math.ceil(this.data.length / this.rowsPerPage);
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

    this.data.push(newData);
    this.originalData.push(newData);

    this.renderTable();
    this.updatePagination();

    this.modal.hide();
    form.reset();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // 행클릭시 스타일 충돌로 인해 넣었습니다
  const style = document.createElement("style");
  style.textContent = `
        .table > tbody > tr.selected { 
            background-color: #cfe2ff !important;
            border-left: 4px solid #0d6efd !important;
        }
    `;
  document.head.appendChild(style);

  window.dataTable = new CustomDataTable("dataTable", dummy);
});
