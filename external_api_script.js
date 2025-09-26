// Minimal Movement Analysis Dashboard JavaScript
class MovementDashboard {
    constructor() {
        this.externalApiUrl = 'https://eucp-movement-analysis-api-dev-h9ayfwarcxeag6e0.westeurope-01.azurewebsites.net';
        this.currentFile = null;
        this.chart = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.checkApiHealth();
    }

    setupEventListeners() {
        // File upload
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });

        // Upload area click
        document.querySelector('.upload-area').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
    }

    setupDragAndDrop() {
        const uploadArea = document.querySelector('.upload-area');
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });
    }

    async handleFileUpload(file) {
        if (!file) return;

        this.currentFile = file.name;
        this.showLoading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.externalApiUrl}/analyze`, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                this.processApiResponse(result);
                this.showAnalysisSection();
            } else {
                this.showError(result.message || 'Failed to process the file.');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            this.showError('Failed to upload the file. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    processApiResponse(result) {
        // Update joint angles list
        this.updateJointAnglesList(result.joint_angles);
        
        // Update joint angles chart
        this.updateJointAnglesChart(result.joint_angles);
        
        // Update analysis results
        this.updateAnalysisResults(result);
    }

    updateJointAnglesList(jointAngles) {
        const container = document.getElementById('jointAnglesList');
        container.innerHTML = '';

        if (!jointAngles || !jointAngles.calculated) {
            return;
        }

        const anglesData = jointAngles.angles || [];
        anglesData.forEach((angleData, index) => {
            const angleItem = document.createElement('div');
            angleItem.className = 'angle-item';
            angleItem.textContent = `${angleData.sensor1} - ${angleData.sensor2}`;
            container.appendChild(angleItem);
        });
    }

    updateJointAnglesChart(jointAngles) {
        if (!jointAngles || !jointAngles.calculated || jointAngles.angles.length === 0) {
            return;
        }

        const ctx = document.getElementById('anglesChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.chart) {
            this.chart.destroy();
        }

        // Prepare data for chart
        const datasets = jointAngles.angles.map((angleData, index) => ({
            label: `${angleData.sensor1} - ${angleData.sensor2}`,
            data: angleData.angles.slice(0, 100), // Limit to first 100 points for performance
            borderColor: this.getColor(index),
            backgroundColor: this.getColor(index, 0.1),
            borderWidth: 2,
            fill: false,
            tension: 0.1
        }));

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: Math.min(100, jointAngles.angles[0]?.angles.length || 0)}, (_, i) => i),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Angle (degrees)',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Frame',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Joint Angles Over Time',
                        font: {
                            size: 16,
                            weight: '600'
                        },
                        color: '#333'
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
    }

    updateAnalysisResults(result) {
        const gridContainer = document.getElementById('resultsGrid');
        const metricsContainer = document.getElementById('metricsSections');
        
        // Get movement metrics if available
        const metrics = result.movement_metrics || {};
        
        // Update results grid
        const resultsHtml = `
            <div class="result-card">
                <div class="result-value">${metrics.repetitions || 0}</div>
                <div class="result-label">Repetitions</div>
            </div>
            <div class="result-card">
                <div class="result-value">${metrics.range_of_motion?.average_rom || 0}°</div>
                <div class="result-label">Average ROM</div>
            </div>
            <div class="result-card">
                <div class="result-value">${metrics.dominant_side || 'Unknown'}</div>
                <div class="result-label">Dominant Side</div>
            </div>
            <div class="result-card">
                <div class="result-value">${metrics.cadence?.reps_per_minute || 0}</div>
                <div class="result-label">Reps/Min</div>
            </div>
            <div class="result-card">
                <div class="result-value">${metrics.weight_distribution?.left || 50}%</div>
                <div class="result-label">Left Side</div>
            </div>
            <div class="result-card">
                <div class="result-value">${metrics.weight_distribution?.right || 50}%</div>
                <div class="result-label">Right Side</div>
            </div>
        `;
        
        gridContainer.innerHTML = resultsHtml;

        // Update metrics sections
        const metricsHtml = `
            ${metrics.weight_distribution ? `
            <div class="metrics-section">
                <h3 class="metrics-title">Weight Distribution</h3>
                <div class="weight-distribution">
                    <div class="weight-item">
                        <span class="weight-label">Left Side:</span>
                        <span class="weight-value">${metrics.weight_distribution.left}%</span>
                    </div>
                    <div class="weight-item">
                        <span class="weight-label">Right Side:</span>
                        <span class="weight-value">${metrics.weight_distribution.right}%</span>
                    </div>
                </div>
                <div class="dominant-side">
                    Dominant Side: <span class="dominant-value">${metrics.dominant_side}</span>
                </div>
            </div>
            ` : ''}
            
            ${metrics.range_of_motion ? `
            <div class="metrics-section">
                <h3 class="metrics-title">Range of Motion</h3>
                <div class="rom-grid">
                    <div class="rom-item">
                        <span class="rom-label">Max ROM:</span>
                        <span class="rom-value">${metrics.range_of_motion.max_rom}°</span>
                    </div>
                    <div class="rom-item">
                        <span class="rom-label">Min ROM:</span>
                        <span class="rom-value">${metrics.range_of_motion.min_rom}°</span>
                    </div>
                    <div class="rom-item">
                        <span class="rom-label">Average ROM:</span>
                        <span class="rom-value">${metrics.range_of_motion.average_rom}°</span>
                    </div>
                </div>
            </div>
            ` : ''}
            
            ${metrics.angular_velocity ? `
            <div class="metrics-section">
                <h3 class="metrics-title">Angular Velocity</h3>
                <div class="velocity-grid">
                    <div class="velocity-item">
                        <span class="velocity-label">Max Velocity:</span>
                        <span class="velocity-value">${metrics.angular_velocity.max_velocity}°/s</span>
                    </div>
                    <div class="velocity-item">
                        <span class="velocity-label">Min Velocity:</span>
                        <span class="velocity-value">${metrics.angular_velocity.min_velocity}°/s</span>
                    </div>
                    <div class="velocity-item">
                        <span class="velocity-label">Average Velocity:</span>
                        <span class="velocity-value">${metrics.angular_velocity.average_velocity}°/s</span>
                    </div>
                </div>
            </div>
            ` : ''}
            
            ${metrics.cadence ? `
            <div class="metrics-section">
                <h3 class="metrics-title">Cadence</h3>
                <div class="cadence-grid">
                    <div class="cadence-item">
                        <span class="cadence-label">${metrics.cadence.reps_per_minute} Reps/min</span>
                    </div>
                    <div class="cadence-item">
                        <span class="cadence-label">${metrics.cadence.time_per_rep}s Time/Rep</span>
                    </div>
                    <div class="cadence-item">
                        <span class="cadence-label">${metrics.cadence.sets} Sets</span>
                    </div>
                </div>
            </div>
            ` : ''}
            
            ${metrics.stride ? `
            <div class="metrics-section">
                <h3 class="metrics-title">Stride</h3>
                <div class="stride-grid">
                    <div class="stride-item">
                        <span class="stride-label">${metrics.stride.length}m Stride Length</span>
                    </div>
                    <div class="stride-item">
                        <span class="stride-label">${metrics.stride.speed}m/s Stride Speed</span>
                    </div>
                    <div class="stride-item">
                        <span class="stride-label">${metrics.stride.asymmetry}% Asymmetry</span>
                    </div>
                </div>
            </div>
            ` : ''}
        `;
        
        metricsContainer.innerHTML = metricsHtml;
    }

    showAnalysisSection() {
        document.getElementById('uploadSection').style.display = 'none';
        document.getElementById('analysisSection').style.display = 'block';
    }

    getColor(index, alpha = 1) {
        const colors = [
            `rgba(220, 53, 69, ${alpha})`, // Red
            `rgba(40, 167, 69, ${alpha})`, // Green
            `rgba(23, 162, 184, ${alpha})`, // Cyan
            `rgba(255, 193, 7, ${alpha})`, // Yellow
            `rgba(111, 66, 193, ${alpha})`, // Purple
            `rgba(253, 126, 20, ${alpha})`, // Orange
        ];
        return colors[index % colors.length];
    }

    showLoading(show) {
        // Create loading element if it doesn't exist
        let loading = document.querySelector('.loading');
        if (!loading) {
            loading = document.createElement('div');
            loading.className = 'loading';
            loading.innerHTML = `
                <div class="spinner"></div>
                <p>Processing your movement data...</p>
            `;
            document.querySelector('.dashboard-main').appendChild(loading);
        }
        
        if (show) {
            loading.style.display = 'block';
        } else {
            loading.style.display = 'none';
        }
    }

    showError(message) {
        // Create error message
        const messageDiv = document.createElement('div');
        messageDiv.className = 'error-message';
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f8d7da;
            color: #721c24;
            padding: 15px 20px;
            border-radius: 8px;
            border: 1px solid #f5c6cb;
            font-weight: 500;
            z-index: 1000;
            max-width: 400px;
        `;
        messageDiv.textContent = message;

        document.body.appendChild(messageDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    async checkApiHealth() {
        try {
            const response = await fetch(`${this.externalApiUrl}/health`);
            const data = await response.json();

            const healthStatus = document.getElementById('healthStatus');
            if (response.ok && data.status === 'ok') {
                healthStatus.textContent = '● API Online';
                healthStatus.className = 'health-status';
            } else {
                healthStatus.textContent = '● API Issues';
                healthStatus.className = 'health-status unhealthy';
            }
        } catch (error) {
            const healthStatus = document.getElementById('healthStatus');
            healthStatus.textContent = '● API Offline';
            healthStatus.className = 'health-status unhealthy';
        }
    }
}

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MovementDashboard();
});