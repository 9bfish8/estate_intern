document.addEventListener('DOMContentLoaded', function() {
    // 사이드바 토글 기능
    const sidebarBtn = document.getElementById('sidebarCollapse');
    const sidebar = document.getElementById('sidebar');
    
    if(sidebarBtn) {
        sidebarBtn.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }

    // 현재 시간 표시
    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        document.querySelector('.current-time').textContent = timeString;
    }
    updateTime();
    setInterval(updateTime, 1000);

    // 데이터 가져오기
    fetch('dummy.json')
        .then(response => response.json())
        .then(data => {
            initializeDashboard(data);
            initializeEmployeeTable(data);
        })
        .catch(error => console.error('Error:', error));

    // 엑셀 다운로드 버튼 이벤트
    document.getElementById('exportExcel').addEventListener('click', function() {
        exportToExcel();
    });

    // 파일 업로드 이벤트 리스너 추가
    document.getElementById('fileUpload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                // 데이터 형식 변환
                const formattedData = jsonData.map(item => ({
                    name: item['이름'] || item.name,
                    company: item['회사'] || item.company,
                    job: item['직무'] || item.job,
                    country: item['국가'] || item.country,
                    salary: item['급여'] || item.salary
                }));

                // DataTable 재초기화
                $('#employeeTable').DataTable().destroy();
                initializeEmployeeTable(formattedData);
                initializeDashboard(formattedData);
            };
            reader.readAsArrayBuffer(file);
        }
    });
});

function initializeDashboard(data) {
    updateSummaryCards(data);
    initializeCharts(data);
    updateSalaryStats(data);
}

function updateSummaryCards(data) {
    // 전체 직원 수
    document.getElementById('totalEmployees').textContent = data.length;
    
    // 평균 급여 계산
    const avgSalary = data.reduce((acc, curr) => {
        return acc + parseFloat(curr.salary.replace('$', '').replace(',', ''));
    }, 0) / data.length;
    document.getElementById('avgSalary').textContent = `$${Math.round(avgSalary).toLocaleString()}`;
    
    // 총 국가 수
    const countries = new Set(data.map(item => item.country));
    document.getElementById('totalCountries').textContent = countries.size;
    
    // 총 회사 수
    const companies = new Set(data.map(item => item.company));
    document.getElementById('totalCompanies').textContent = companies.size;
}

function initializeCharts(data) {
    // 직무 분포 차트
    const jobDistCtx = document.getElementById('salaryChart').getContext('2d');
    const jobDistData = calculateJobDistribution(data);
    
    new Chart(jobDistCtx, {
        type: 'pie',
        data: {
            labels: jobDistData.labels,
            datasets: [{
                data: jobDistData.data,
                backgroundColor: generateColors(jobDistData.labels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                },
                title: {
                    display: true,
                    text: '직무 분포도'
                }
            }
        }
    });

    // 국가별 직원 분포 차트
    const countryCtx = document.getElementById('countryChart').getContext('2d');
    const countryData = calculateCountryDistribution(data);
    
    new Chart(countryCtx, {
        type: 'doughnut',
        data: {
            labels: countryData.labels,
            datasets: [{
                data: countryData.data,
                backgroundColor: generateColors(countryData.labels.length),
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                },
                title: {
                    display: true,
                    text: '국가별 직원 분포'
                }
            }
        }
    });

    // 직무별 평균 급여 차트
    const jobSalaryCtx = document.getElementById('jobSalaryChart').getContext('2d');
    const jobSalaryData = calculateJobSalaries(data);
    
    new Chart(jobSalaryCtx, {
        type: 'bar',
        data: {
            labels: jobSalaryData.labels,
            datasets: [{
                label: '평균 급여($)',
                data: jobSalaryData.data,
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: '직무별 평균 급여 (상위 10개)'
                }
            }
        }
    });
}

function updateSalaryStats(data) {
    // 급여 데이터 추출 및 정렬
    const salaries = data.map(item => 
        parseFloat(item.salary.replace('$', '').replace(',', ''))
    ).sort((a, b) => a - b);

    // 최고 급여
    const maxSalary = salaries[salaries.length - 1];
    document.getElementById('maxSalary').textContent = `$${Math.round(maxSalary).toLocaleString()}`;

    // 최저 급여
    const minSalary = salaries[0];
    document.getElementById('minSalary').textContent = `$${Math.round(minSalary).toLocaleString()}`;

    // 중간값
    const mid = Math.floor(salaries.length / 2);
    const medianSalary = salaries.length % 2 ? salaries[mid] : (salaries[mid - 1] + salaries[mid]) / 2;
    document.getElementById('medianSalary').textContent = `$${Math.round(medianSalary).toLocaleString()}`;
}

function initializeEmployeeTable(data) {
    let searchTimeout;

    const table = $('#employeeTable').DataTable({
        data: data,
        columns: [
            { data: 'name' },
            { data: 'company' },
            { data: 'job' },
            { data: 'country' },
            {
                data: 'salary',
                render: (data, type) => type === 'display' ? `$${parseInt(data.replace('$', '')).toLocaleString()}` : data
            }
        ],
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/ko.json'
        },
        pageLength: 10,
        responsive: true,
        order: [[0, 'asc']],
        search: {
            smart: true
        },
        // 검색 이벤트를 지연시키는 설정
        searchDelay: 1000 // 1초 지연
    });

    return table;
}

// 엑셀 내보내기 함수
function exportToExcel() {
    // 데이터 다시 가져오기
    fetch('dummy.json')
        .then(response => response.json())
        .then(data => {
            // 워크북 생성
            const wb = XLSX.utils.book_new();
            
            // 데이터를 워크시트에 맞는 형식으로 변환
            const wsData = data.map(item => ({
                '이름': item.name,
                '회사': item.company,
                '직무': item.job,
                '국가': item.country,
                '급여': item.salary
            }));
            
            // 워크시트 생성
            const ws = XLSX.utils.json_to_sheet(wsData);
            
            // 열 너비 설정
            const columnWidths = [
                { wch: 20 }, // 이름
                { wch: 15 }, // 회사
                { wch: 20 }, // 직무
                { wch: 15 }, // 국가
                { wch: 15 }  // 급여
            ];
            ws['!cols'] = columnWidths;

            // 워크시트를 워크북에 추가
            XLSX.utils.book_append_sheet(wb, ws, "직원목록");
            
            // 파일 저장
            XLSX.writeFile(wb, "employee_data.xlsx");
        })
        .catch(error => console.error('Error:', error));
}

function calculateJobDistribution(data) {
    const jobCount = {};
    data.forEach(item => {
        jobCount[item.job] = (jobCount[item.job] || 0) + 1;
    });

    // 상위 10개 직무만 선택하고 나머지는 '기타'로 분류
    const sortedJobs = Object.entries(jobCount)
        .sort((a, b) => b[1] - a[1]);
    
    const top10 = sortedJobs.slice(0, 10);
    const others = sortedJobs.slice(10).reduce((acc, curr) => acc + curr[1], 0);

    return {
        labels: [...top10.map(item => item[0]), '기타'],
        data: [...top10.map(item => item[1]), others]
    };
}

function calculateCountryDistribution(data) {
    const countryCount = {};
    data.forEach(item => {
        countryCount[item.country] = (countryCount[item.country] || 0) + 1;
    });

    // 상위 10개 국가만 선택
    const sortedCountries = Object.entries(countryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    return {
        labels: sortedCountries.map(item => item[0]),
        data: sortedCountries.map(item => item[1])
    };
}

function calculateJobSalaries(data) {
    const jobSalaries = {};
    const jobCounts = {};
    
    data.forEach(item => {
        const salary = parseFloat(item.salary.replace('$', '').replace(',', ''));
        if (!jobSalaries[item.job]) {
            jobSalaries[item.job] = 0;
            jobCounts[item.job] = 0;
        }
        jobSalaries[item.job] += salary;
        jobCounts[item.job]++;
    });

    // 평균 계산 및 정렬
    const avgSalaries = Object.keys(jobSalaries).map(job => ({
        job: job,
        avg: jobSalaries[job] / jobCounts[job]
    }));

    avgSalaries.sort((a, b) => b.avg - a.avg);
    const top10 = avgSalaries.slice(0, 10);

    return {
        labels: top10.map(item => item.job),
        data: top10.map(item => Math.round(item.avg))
    };
}

function generateColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
        const hue = (i * 360) / count;
        colors.push(`hsla(${hue}, 70%, 60%, 0.8)`);
    }
    return colors;
}