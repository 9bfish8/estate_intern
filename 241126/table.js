/**
 * 
 * 리팩토링 사항
 * 1. class 단위업무별로 분리 (데이터관리 + UI)
 * 2. 페이지네이션 데이터처리 (fragment사용) + 이전 및 다음 버튼은 html로
 * 3. 검색시 setTimeout
 * 데이터 처리를 담당하는 클래스
 * CRUD 작업, 검색, 정렬, 페이지네이션 등 데이터 관련 모든 로직을 처리
 */
class DataService {
  /**
   */
  constructor(data) {
      // 원본 데이터와 작업용 데이터를 분리하여 관리
      this.originalData = [...data];  
      this.data = [...data];          
      this.sortColumn = null;        
      this.sortDirection = "asc";    
      this.searchTerm = "";         
  }

  /**
   * 데이터 검색 메서드
   */
  search(term) {
      this.searchTerm = term.toLowerCase();

      // 검색어가 없으면 전체 데이터 반환
      if (this.searchTerm === "") {
          this.data = [...this.originalData];
          return this.data;
      }

      // 모든 컬럼에서 검색어 포함 여부 확인
      this.data = this.originalData.filter(row => {
          return Object.values(row).some(value => {
              const strValue = value.toString().toLowerCase();
              // 급여 데이터는 특별 처리 ($, 콤마 제거 후 비교)
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

  /**
   * 데이터 정렬 메서드
   *{column, direction}
   */
  sort(column) {
      // 같은 컬럼 클릭시 정렬 방향 토글, 다른 컬럼이면 오름차순으로 시작
      if (this.sortColumn === column) {
          this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
      } else {
          this.sortColumn = column;
          this.sortDirection = "asc";
      }

      // 데이터 정렬 수행
      this.data.sort((a, b) => {
          let aVal = a[column];
          let bVal = b[column];

          // 급여 컬럼은 숫자로 변환하여 정렬
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

      return {
          column: this.sortColumn,
          direction: this.sortDirection
      };
  }

  /**
   * 선택된 데이터 삭제 메서드
   */
  delete(indexes) {
      // 큰 인덱스부터 삭제하여 인덱스 변화 방지
      indexes.sort((a, b) => b - a).forEach(index => {
          this.data.splice(index, 1);
      });
      this.originalData = [...this.data];
      return this.data;
  }

  /**
   * 새 데이터 추가 메서드
   */
  add(newData) {
      this.data.push(newData);
      this.originalData.push(newData);
      return this.data;
  }

  /**
   * 페이지네이션된 데이터 반환 메서드
   */
  getPaginatedData(page, rowsPerPage) {
      const start = (page - 1) * rowsPerPage;
      const end = rowsPerPage === -1 ? this.data.length : start + rowsPerPage;
      return this.data.slice(start, end);
  }

  /**
   * 전체 페이지 수 계산 메서드
   */
  getTotalPages(rowsPerPage) {
      return rowsPerPage === -1 ? 1 : Math.ceil(this.data.length / rowsPerPage);
  }

  /**
   * 전체 급여 합계 계산 메서드
   */
  calculateTotal() {
      return this.data.reduce((sum, row) => {
          return sum + parseInt(row.salary.replace(/[$,]/g, ""));
      }, 0);
  }

  /**
   * 현재 데이터 수 반환 메서드
   */
  getDataLength() {
      return this.data.length;
  }
}

/**
* UI 처리를 담당하는 클래스
* 테이블 렌더링, 이벤트 처리, 사용자 인터랙션 관리
*/
class TableUI {
  // 테이블 컬럼 정의를 정적 상수로 관리
  static COLUMNS = ['name', 'company', 'job', 'country', 'email', 'salary'];
  
  /**
   * TableUI 클래스 생성자
   */
  constructor(tableId, dataService) {
      this.table = document.getElementById(tableId);
      this.dataService = dataService;
      this.currentPage = 1;            // 현재 페이지
      this.rowsPerPage = 10;           // 페이지당 행 수
      this.selectedRows = new Set();    // 선택된 행 집합
      this.modal = new bootstrap.Modal(document.getElementById("dataModal"));
      
      this.init();
  }

  /**
   * 초기화 메서드
   * 이벤트 설정 및 초기 렌더링 수행
   */
  init() {
      this.setupEventListeners();
      this.renderTable();
      this.updatePagination();
      this.updateTotal();
  }

  /**
   * 이벤트 리스너 설정 메서드
   * 모든 사용자 인터랙션 이벤트 처리
   */
  setupEventListeners() {
      // 정렬 이벤트 - 헤더 클릭
      document.querySelectorAll('th[data-sort]').forEach(th => {
          th.addEventListener('click', () => {
              const { column, direction } = this.dataService.sort(th.dataset.sort);
              this.updateSortIcons(column, direction);
              this.renderTable();
          });
      });

      // 검색 이벤트 - 디바운스 적용
      document.getElementById("searchInput").addEventListener("input", 
          this.debounce(e => {
              this.dataService.search(e.target.value);
              this.currentPage = 1;
              this.renderTable();
              this.updatePagination();
          }, 300)  // 300ms 디바운스
      );

      // 페이지당 행 수 변경
      document.getElementById("rowsPerPage").addEventListener("change", e => {
          this.rowsPerPage = parseInt(e.target.value);
          this.currentPage = 1;
          this.renderTable();
          this.updatePagination();
      });

      // 페이지네이션 네비게이션 버튼
      document.getElementById("prevPage").addEventListener("click", () => this.goToPage(this.currentPage - 1));
      document.getElementById("nextPage").addEventListener("click", () => this.goToPage(this.currentPage + 1));

      // 행 선택 이벤트 - 이벤트 위임 사용
      this.table.querySelector("tbody").addEventListener("click", e => {
        const tr = e.target.closest("tr");
        if (tr) {
            const index = parseInt(tr.dataset.index);
            this.toggleRowSelection(tr, index);
            
            // 행 선택 상태를 명확하게 표시
            tr.classList.toggle("selected");
            
            // 선택 상태 디버깅 로그
            console.log(`Row ${index} selection status:`, {
                isSelected: this.selectedRows.has(index),
                hasSelectedClass: tr.classList.contains("selected")
            });
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

  /**
   * 디바운스 함수 - 연속적인 이벤트 처리 최적화
   */
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

  /**
   * 정렬 아이콘 업데이트 메서드
   */
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

  /**
   * 급여 포맷팅 메서드

   */
  formatSalary(salary) {
      const num = parseInt(salary.replace(/[$,]/g, ""));
      return `$${num.toLocaleString()}`;
  }

  /**
   * 테이블 렌더링 메서드
   * DocumentFragment를 사용
   * 
   *  // 처음코드
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

   // fragment 적용

   renderTable() {
    const tbody = this.table.querySelector("tbody");
    tbody.innerHTML = "";

    const start = (this.currentPage - 1) * this.rowsPerPage;
    const end = this.rowsPerPage === -1 ? this.data.length : start + this.rowsPerPage;
    const paginatedData = this.data.slice(start, end);

    // DocumentFragment 생성
    const fragment = document.createDocumentFragment();
    
    // tr 문자열 템플릿 생성 함수
    const createRowTemplate = (row, dataIndex) => {
        const values = [
            row.name,
            row.company,
            row.job,
            row.country,
            row.email,
            this.formatSalary(row.salary)
        ];

        const tr = document.createElement('tr');
        tr.dataset.index = dataIndex;
        
        if (this.selectedRows.has(dataIndex)) {
            tr.classList.add("selected");
        }

        // td 요소들을 직접 생성하여 추가
        values.forEach(value => {
            const td = document.createElement('td');
            td.textContent = value;
            tr.appendChild(td);
        });

        return tr;
    };

    // 각 행에 대해 tr 생성하고 fragment에 추가
    paginatedData.forEach((row, index) => {
        const dataIndex = start + index;
        const tr = createRowTemplate(row, dataIndex);
        fragment.appendChild(tr);
    });

    // fragment를 tbody에 추가
    tbody.appendChild(fragment);

    this.calculateTotal();
}
   */
  renderTable() {
      const start = (this.currentPage - 1) * this.rowsPerPage;
      const data = this.dataService.getPaginatedData(this.currentPage, this.rowsPerPage);
      const fragment = document.createDocumentFragment();
      
      data.forEach((row, i) => {
          const tr = document.createElement('tr');
          const index = start + i;
          tr.dataset.index = index;
          
          if (this.selectedRows.has(index)) {
              tr.classList.add('selected');
          }
          
          TableUI.COLUMNS.forEach(column => {
              const td = document.createElement('td');
              td.textContent = column === 'salary' ? 
                  this.formatSalary(row[column]) : 
                  row[column];
              tr.appendChild(td);
          });
          
          fragment.appendChild(tr);
      });

      const tbody = this.table.querySelector("tbody");
      tbody.replaceChildren(fragment);
      
      this.updateTotal();
  }

  /**
   * 합계 업데이트 메서드
   */
  updateTotal() {
      const total = this.dataService.calculateTotal();
      document.getElementById("totalSalary").textContent = this.formatSalary(total.toString());
  }

  /**
   * 페이지네이션 UI 업데이트 메서드
   */
  updatePagination() {
      const totalPages = this.dataService.getTotalPages(this.rowsPerPage);
      const container = document.querySelector(".page-numbers");
      const info = document.querySelector(".page-info");
      const totalItems = this.dataService.getDataLength();

      // 페이지 정보 텍스트 업데이트
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

  /**
   * 페이지 이동 메서드
   */
  goToPage(page) {
      const totalPages = this.dataService.getTotalPages(this.rowsPerPage);
      if (page >= 1 && page <= totalPages) {
          this.currentPage = page;
          this.renderTable();
          this.updatePagination();
      }
  }

  /**
   * 행 선택/해제 토글 메서드
   * {HTMLElement} tr - 행 요소
   */
  toggleRowSelection(tr, index) {
    if (this.selectedRows.has(index)) {
        this.selectedRows.delete(index);
        tr.classList.remove("selected");
    } else {
        this.selectedRows.add(index);
        tr.classList.add("selected");
    }
    
    // 선택된 행 상태 업데이트를 위한 스타일 강제 적용
    requestAnimationFrame(() => {
        if (this.selectedRows.has(index)) {
            tr.style.backgroundColor = "#cfe2ff";
            tr.style.borderLeft = "4px solid #0d6efd";
        } else {
            tr.style.backgroundColor = "";
            tr.style.borderLeft = "";
        }
    });
}

  /**
   * 선택된 행 삭제 처리 메서드
   */
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

  /**
   * 데이터 저장 처리 메서드
   */
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

// 애플리케이션 초기화
document.addEventListener("DOMContentLoaded", () => {
  const dataService = new DataService(dummy);
  const tableUI = new TableUI("dataTable", dataService);
});