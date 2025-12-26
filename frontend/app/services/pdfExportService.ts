import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

interface AnalysisResult {
    exerciseType: 'Squat' | 'Leg Knee Extension';
    jointAngles: number[];
    metrics: {
        repetitionCount: number;
        maxFlexionAngle: number;
        maxExtensionAngle: number;
        centerOfMass?: {
            dominantSide: 'left' | 'right';
            distribution: {
                left: number;
                right: number;
            };
        };
    };
}

export const generateMovementAnalysisPDF = async (analysisResult: AnalysisResult): Promise<string> => {
    const { exerciseType, jointAngles, metrics } = analysisResult;
    
    const romMax = Math.max(...jointAngles);
    const romMin = Math.min(...jointAngles);
    const romAvg = jointAngles.reduce((a, b) => a + b, 0) / jointAngles.length;
    
    const centerOfMass = metrics.centerOfMass || {
        dominantSide: 'left' as const,
        distribution: {
            left: 50,
            right: 50
        }
    };

    // Generate chart data for HTML
    const chartData = jointAngles.map((angle, index) => ({ x: index, y: angle }));
    const chartPoints = chartData.map(point => `${point.x},${point.y}`).join(' ');

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Movement Analysis Report</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background-color: #f5f5f5;
                }
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                    background-color: white;
                    padding: 30px;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .header {
                    text-align: center;
                    border-bottom: 2px solid #007AFF;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .title {
                    font-size: 28px;
                    font-weight: bold;
                    color: #333;
                    margin: 0;
                }
                .subtitle {
                    font-size: 16px;
                    color: #666;
                    margin: 10px 0 0 0;
                }
                .section {
                    margin-bottom: 30px;
                    padding: 20px;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    background-color: #fafafa;
                }
                .section-title {
                    font-size: 20px;
                    font-weight: bold;
                    color: #333;
                    margin-bottom: 15px;
                    border-bottom: 1px solid #007AFF;
                    padding-bottom: 5px;
                }
                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 20px;
                }
                .metric-card {
                    background-color: white;
                    padding: 15px;
                    border-radius: 8px;
                    border-left: 4px solid #007AFF;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }
                .metric-value {
                    font-size: 24px;
                    font-weight: bold;
                    color: #007AFF;
                    margin-bottom: 5px;
                }
                .metric-label {
                    font-size: 14px;
                    color: #666;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .chart-container {
                    margin: 20px 0;
                    padding: 20px;
                    background-color: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }
                .chart-title {
                    font-size: 18px;
                    font-weight: bold;
                    color: #333;
                    margin-bottom: 15px;
                    text-align: center;
                }
                .chart {
                    width: 100%;
                    height: 300px;
                    background-color: #f8f9fa;
                    border-radius: 8px;
                    position: relative;
                    overflow: hidden;
                }
                .chart-line {
                    fill: none;
                    stroke: #007AFF;
                    stroke-width: 2;
                }
                .chart-grid {
                    stroke: #e0e0e0;
                    stroke-width: 1;
                }
                .summary-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                .summary-table th,
                .summary-table td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #e0e0e0;
                }
                .summary-table th {
                    background-color: #007AFF;
                    color: white;
                    font-weight: bold;
                }
                .summary-table tr:nth-child(even) {
                    background-color: #f8f9fa;
                }
                .footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #e0e0e0;
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                }
                .highlight {
                    color: #007AFF;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 class="title">Movement Analysis Report</h1>
                    <p class="subtitle">${exerciseType} Exercise Analysis</p>
                    <p class="subtitle">Generated on ${new Date().toLocaleDateString()}</p>
                </div>

                <div class="section">
                    <h2 class="section-title">Exercise Overview</h2>
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-value">${metrics.repetitionCount}</div>
                            <div class="metric-label">Total Repetitions</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${exerciseType}</div>
                            <div class="metric-label">Exercise Type</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${jointAngles.length}</div>
                            <div class="metric-label">Data Points</div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h2 class="section-title">Range of Motion Analysis</h2>
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-value">${romMax.toFixed(1)}°</div>
                            <div class="metric-label">Maximum ROM</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${romMin.toFixed(1)}°</div>
                            <div class="metric-label">Minimum ROM</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${romAvg.toFixed(1)}°</div>
                            <div class="metric-label">Average ROM</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${(romMax - romMin).toFixed(1)}°</div>
                            <div class="metric-label">ROM Range</div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h2 class="section-title">Joint Angle Progression</h2>
                    <div class="chart-container">
                        <h3 class="chart-title">Knee Angle Over Time</h3>
                        <div class="chart">
                            <svg width="100%" height="100%" viewBox="0 0 700 250">
                                <defs>
                                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" style="stop-color:#007AFF;stop-opacity:1" />
                                        <stop offset="100%" style="stop-color:#007AFF;stop-opacity:0.3" />
                                    </linearGradient>
                                </defs>
                                <!-- Grid lines -->
                                <g class="chart-grid">
                                    ${Array.from({ length: 10 }, (_, i) => {
                                        const y = (i * 250) / 10;
                                        return `<line x1="0" y1="${y}" x2="700" y2="${y}" stroke="#e0e0e0" stroke-width="1"/>`;
                                    }).join('')}
                                    ${Array.from({ length: 14 }, (_, i) => {
                                        const x = (i * 700) / 14;
                                        return `<line x1="${x}" y1="0" x2="${x}" y2="250" stroke="#e0e0e0" stroke-width="1"/>`;
                                    }).join('')}
                                </g>
                                <!-- Chart line -->
                                <polyline 
                                    points="${chartPoints}" 
                                    fill="none" 
                                    stroke="#007AFF" 
                                    stroke-width="2"
                                    transform="scale(1, -1) translate(0, -250)"
                                />
                                <!-- Area under curve -->
                                <polygon 
                                    points="0,250 ${chartPoints} 700,250" 
                                    fill="url(#lineGradient)" 
                                    opacity="0.3"
                                    transform="scale(1, -1) translate(0, -250)"
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h2 class="section-title">Center of Mass Analysis</h2>
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-value">${centerOfMass.distribution.left.toFixed(1)}%</div>
                            <div class="metric-label">Left Side Weight</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${centerOfMass.distribution.right.toFixed(1)}%</div>
                            <div class="metric-label">Right Side Weight</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value highlight">${centerOfMass.dominantSide.charAt(0).toUpperCase() + centerOfMass.dominantSide.slice(1)}</div>
                            <div class="metric-label">Dominant Side</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${Math.abs(centerOfMass.distribution.left - centerOfMass.distribution.right).toFixed(1)}%</div>
                            <div class="metric-label">Asymmetry</div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h2 class="section-title">Performance Metrics</h2>
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-value">${(romMax / 2).toFixed(1)}°/s</div>
                            <div class="metric-label">Max Angular Velocity</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${(romAvg / 2).toFixed(1)}°/s</div>
                            <div class="metric-label">Avg Angular Velocity</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${(metrics.repetitionCount * 2).toFixed(1)}</div>
                            <div class="metric-label">Reps per Minute</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${(60 / metrics.repetitionCount).toFixed(1)}s</div>
                            <div class="metric-label">Time per Rep</div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h2 class="section-title">Detailed Summary</h2>
                    <table class="summary-table">
                        <thead>
                            <tr>
                                <th>Metric</th>
                                <th>Value</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Exercise Type</td>
                                <td>${exerciseType}</td>
                                <td>Type of exercise performed</td>
                            </tr>
                            <tr>
                                <td>Total Repetitions</td>
                                <td>${metrics.repetitionCount}</td>
                                <td>Number of complete movement cycles</td>
                            </tr>
                            <tr>
                                <td>Maximum ROM</td>
                                <td>${romMax.toFixed(1)}°</td>
                                <td>Highest joint angle achieved</td>
                            </tr>
                            <tr>
                                <td>Minimum ROM</td>
                                <td>${romMin.toFixed(1)}°</td>
                                <td>Lowest joint angle achieved</td>
                            </tr>
                            <tr>
                                <td>Average ROM</td>
                                <td>${romAvg.toFixed(1)}°</td>
                                <td>Mean joint angle throughout exercise</td>
                            </tr>
                            <tr>
                                <td>ROM Range</td>
                                <td>${(romMax - romMin).toFixed(1)}°</td>
                                <td>Difference between max and min angles</td>
                            </tr>
                            <tr>
                                <td>Dominant Side</td>
                                <td>${centerOfMass.dominantSide.charAt(0).toUpperCase() + centerOfMass.dominantSide.slice(1)}</td>
                                <td>Side bearing more weight</td>
                            </tr>
                            <tr>
                                <td>Left Side Weight</td>
                                <td>${centerOfMass.distribution.left.toFixed(1)}%</td>
                                <td>Percentage of weight on left side</td>
                            </tr>
                            <tr>
                                <td>Right Side Weight</td>
                                <td>${centerOfMass.distribution.right.toFixed(1)}%</td>
                                <td>Percentage of weight on right side</td>
                            </tr>
                            <tr>
                                <td>Asymmetry</td>
                                <td>${Math.abs(centerOfMass.distribution.left - centerOfMass.distribution.right).toFixed(1)}%</td>
                                <td>Weight distribution imbalance</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="footer">
                    <p>Report generated by Movement Analysis System</p>
                    <p>Date: ${new Date().toLocaleDateString()} | Time: ${new Date().toLocaleTimeString()}</p>
                </div>
            </div>
        </body>
        </html>
    `;

    return htmlContent;
};

export const exportMovementAnalysisPDF = async (analysisResult: AnalysisResult): Promise<void> => {
    try {
        const htmlContent = await generateMovementAnalysisPDF(analysisResult);
        
        const { uri } = await Print.printToFileAsync({
            html: htmlContent,
            base64: false
        });

        if (Platform.OS === 'web') {
            // For web, create a download link
            const link = document.createElement('a');
            link.href = uri;
            link.download = `movement-analysis-${analysisResult.exerciseType.toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // For mobile, share the file
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: 'Export Movement Analysis Report'
            });
        }
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw new Error('Failed to generate PDF report');
    }
}; 