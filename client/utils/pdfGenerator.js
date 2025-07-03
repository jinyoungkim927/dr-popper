import jsPDF from 'jspdf';

export async function generateSessionReport(sessionData) {
    const doc = new jsPDF();

    // Constants for layout
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = margin;

    // Helper functions
    const addText = (text, fontSize = 12, fontStyle = 'normal', align = 'left') => {
        doc.setFontSize(fontSize);
        doc.setFont(undefined, fontStyle);

        if (align === 'center') {
            doc.text(text, pageWidth / 2, yPosition, { align: 'center' });
        } else {
            doc.text(text, margin, yPosition);
        }
        yPosition += fontSize * 0.4;
    };

    const addLine = () => {
        yPosition += 5;
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;
    };

    const checkPageBreak = (requiredSpace = 30) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
        }
    };

    // Header
    addText('Medical Examination Session Report', 18, 'bold', 'center');
    yPosition += 8;

    // Session info
    addText(`Student: ${sessionData.studentName}`, 11);
    addText(`Date: ${new Date(sessionData.sessionDate).toLocaleDateString()}`, 11);
    addText(`Session Duration: ${sessionData.duration || 'N/A'}`, 11);

    addLine();

    // Overall Performance
    addText('Overall Performance', 14, 'bold');
    yPosition += 4;
    addText(`Total Cases Completed: ${sessionData.totalCases}`, 11);
    addText(`Average Score: ${sessionData.averageScore}%`, 11);
    addText(`Grade: ${sessionData.grade}`, 11);

    addLine();

    // Individual Case Breakdown
    addText('Case-by-Case Breakdown', 14, 'bold');
    yPosition += 8;

    sessionData.cases.forEach((caseData, index) => {
        checkPageBreak(60);

        // Case header
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 18, 'F');

        addText(`Case ${index + 1}: ${caseData.title || 'Untitled'}`, 12, 'bold');
        addText(`Score: ${caseData.score}% | Duration: ${caseData.duration || 'N/A'}`, 10);

        yPosition += 8;

        // Subsection scores
        if (caseData.subsections && caseData.subsections.length > 0) {
            addText('Subsection Performance:', 11, 'bold');
            yPosition += 4;

            caseData.subsections.forEach(subsection => {
                const scoreColor = subsection.score >= 80 ? [0, 128, 0] :
                    subsection.score >= 60 ? [255, 165, 0] : [255, 0, 0];

                doc.setTextColor(...scoreColor);
                addText(`  • ${subsection.name}: ${subsection.score}%`, 10);
                doc.setTextColor(0, 0, 0);

                if (subsection.feedback) {
                    doc.setFontSize(9);
                    doc.setTextColor(100, 100, 100);
                    const feedbackLines = doc.splitTextToSize(`    ${subsection.feedback}`, pageWidth - 2 * margin - 20);
                    feedbackLines.forEach(line => {
                        addText(line, 9);
                    });
                    doc.setTextColor(0, 0, 0);
                }
            });
        }

        // Case feedback
        if (caseData.feedback) {
            yPosition += 4;
            addText('Examiner Feedback:', 10, 'bold');
            const feedbackLines = doc.splitTextToSize(caseData.feedback, pageWidth - 2 * margin);
            feedbackLines.forEach(line => {
                addText(line, 10);
            });
        }

        yPosition += 12;
    });

    // Analysis section - NEW
    if (sessionData.analysis) {
        checkPageBreak(80);
        addLine();
        addText('Detailed Performance Analysis', 14, 'bold');
        yPosition += 8;

        // Split analysis into lines and format
        const analysisLines = doc.splitTextToSize(sessionData.analysis, pageWidth - 2 * margin);
        analysisLines.forEach(line => {
            // Check if line starts with a number (for numbered sections)
            if (/^\d\./.test(line)) {
                yPosition += 4;
                doc.setFont(undefined, 'bold');
                addText(line, 10);
                doc.setFont(undefined, 'normal');
            } else {
                addText(line, 9);
            }
        });
    }

    // Session Transcript
    if (sessionData.transcript) {
        checkPageBreak(60);
        addLine();
        addText('Session Transcript', 14, 'bold');
        yPosition += 8;

        // Split transcript into manageable chunks
        const transcriptLines = doc.splitTextToSize(sessionData.transcript, pageWidth - 2 * margin);
        transcriptLines.forEach((line, index) => {
            if (index > 0 && index % 50 === 0) {
                checkPageBreak(30);
            }
            addText(line, 9);
            yPosition += 2;
        });
    }

    // Footer
    checkPageBreak(40);
    addLine();
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Generated by Medical Exam Preparation System', margin, pageHeight - 10);
    doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });

    // Generate filename
    const fileName = `med-exam-report-${sessionData.studentName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

    return {
        pdf: doc,
        fileName,
        download: () => doc.save(fileName),
        getBlob: () => doc.output('blob'),
        getDataUri: () => doc.output('datauristring')
    };
}

export function formatSessionDataForReport(sessionScores, cases, studentProfile) {
    // Calculate statistics from actual case scores
    const totalCases = cases.length;

    // Calculate average from actual case scores, not sessionScores
    const caseScores = cases.map(c => c.score || 0);
    const averageScore = totalCases > 0
        ? Math.round(caseScores.reduce((sum, score) => sum + score, 0) / totalCases)
        : 0;

    const grade = averageScore >= 90 ? 'A' :
        averageScore >= 80 ? 'B' :
            averageScore >= 70 ? 'C' :
                averageScore >= 60 ? 'D' : 'F';

    // Identify weak areas from subsections
    const weakAreas = [];
    const subsectionScores = {};

    cases.forEach(caseData => {
        if (caseData.subsections) {
            caseData.subsections.forEach(subsection => {
                const key = subsection.name || 'Unknown';
                if (!subsectionScores[key]) {
                    subsectionScores[key] = [];
                }
                subsectionScores[key].push(subsection.score || 0);
            });
        }
    });

    Object.entries(subsectionScores).forEach(([subsection, scores]) => {
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avgScore < 70) {
            weakAreas.push(`${subsection} (avg: ${Math.round(avgScore)}%)`);
        }
    });

    // Generate recommendations
    const recommendations = [];
    if (averageScore < 60) {
        recommendations.push('Review fundamental concepts across all systems');
        recommendations.push('Practice with easier cases before attempting complex scenarios');
    } else if (averageScore < 80) {
        recommendations.push('Focus on clinical reasoning and decision-making');
        recommendations.push('Practice time management during case discussions');
    }

    if (weakAreas.length > 0) {
        recommendations.push(`Prioritize revision of: ${weakAreas.slice(0, 3).join(', ')}`);
    }

    // Calculate session duration
    const duration = cases.length > 0 && cases[0].duration ?
        cases.reduce((total, c) => {
            const match = (c.duration || '0m').match(/(\d+)m/);
            return total + (match ? parseInt(match[1]) : 0);
        }, 0) + 'm' : 'N/A';

    return {
        studentName: studentProfile?.name || 'Student',
        sessionDate: new Date().toISOString(),
        duration: duration,
        totalCases,
        averageScore,
        grade,
        cases: cases.map(c => ({
            id: c.id,
            title: c.title,
            score: c.score || 0,  // Use the actual case score
            subsections: c.subsections || [],
            duration: c.duration,
            feedback: c.feedback
        })),
        weakAreas,
        recommendations
    };
} 
