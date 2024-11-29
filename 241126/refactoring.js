// 리팩토링 진행중

// 상수랑 설정관리

class TableConfig {
    static get COLUMNS() {
        return ['name', 'company', 'job', 'country', 'email', 'salary'];
    
    }

    static get DEFAULT_PAGE_SIZE() {
        return 10;
    }

    static get DEBOUNCE_DELAY() {
        return 300;
    }
    static get SALARY_FORMAT() {
        return {
            currency: '$',
            locale: 'en-US'
        };
    }
}

// 유틸리티 함수들... . . . . . . ?
// 디바운스랑 setTimeout을 같이 쓰면 메모리누수가 안생기지않나 싶음...
// 디바운스는 반환되는 함수를 아무리 많이 호출하더라도 지정된 시간 프레인 내에서 한번만 실행되기때문 => 그럼 클로저 내부에도 있을수있겠다
// 그냥 setTimeout을 쓰면 메모리누수의 위험 그래서 같이 쓰면 중간과정 안봐도 되고 페이지부하가 더 적지않을까...............하는 예상
// 근데 디바운스는 커스텀 함수로 사용하는 경우가 많다고 함..........

class Utils {
    static debounce(func,wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...arg);
            
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static formatSalary(salary) {
        const num = parseInt(salary.replace(/[$,]/g,""));
        return `${TableConfig.SALARY_FORMAT.currency}${num.toLocaleString(TableConfig.SALARY_FORMAT.locale)}`;
    }
}


// 이벤트 관리자
class EventManager {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback){
        if(this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
         
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }

    Off(event, callback) {
        if(this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }
}
// 데이터 관리자
class DataService {
    constructor(data, eventManager) {
        this.originalData = [...data];
        this.data = [...data];
        this.eventmanager = eventManager;
        this.state = { 
            sortColumn: null,
            sortDirection: "asc",
            searchTerm: ""
        };
    }

    setState(newState) {
        Object.assign(this.state, newState);
        this.eventManager.emit('stateChange',this.state);
    }

    search(term) {
        this.setState({searchTerm: term.toLowerCase()});
    
        if(this.state.searchTerm === "") {
            this.data = [...this.originalData];
            return this.data;
        }

        this.data = this.originalData.filter(row => {
            return Object.values(row).some(value => {

            })
        })
    }
}
// ui 렌더링 관리자
// 페이지네이션 관리자
// 선택 관리자????
// 