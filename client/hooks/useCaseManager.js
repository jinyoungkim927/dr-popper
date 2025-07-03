import { useCallback, useState } from 'react';

export function useCaseManager() {
    const [currentCase, setCurrentCase] = useState(null);
    const [caseStartTime, setCaseStartTime] = useState(null);
    const [completedCases, setCompletedCases] = useState([]);
    const [isLoadingCase, setIsLoadingCase] = useState(false);

    const startCase = useCallback((caseData) => {
        setCurrentCase(caseData);
        setCaseStartTime(Date.now());
    }, []);

    const completeCase = useCallback((score, subsectionScores) => {
        if (!currentCase) return;

        const completedCase = {
            id: currentCase.id,
            title: currentCase.title,
            score,
            subsections: subsectionScores,
            duration: caseStartTime ? Math.round((Date.now() - caseStartTime) / 60000) : 0,
            timestamp: new Date()
        };

        setCompletedCases(prev => [...prev, completedCase]);
        setCurrentCase(null);
        setCaseStartTime(null);
    }, [currentCase, caseStartTime]);

    const loadCase = useCallback(async (caseNumber) => {
        setIsLoadingCase(true);
        try {
            const response = await fetch(`/api/case-protocol/${caseNumber}`);
            const data = await response.json();

            if (data.error) throw new Error(data.error);

            return {
                id: `case-protocol-${caseNumber}`,
                caseNumber,
                title: data.title,
                category: data.category,
                content: data.content
            };
        } catch (error) {
            console.error('Error loading case:', error);
            throw error;
        } finally {
            setIsLoadingCase(false);
        }
    }, []);

    return {
        currentCase,
        caseStartTime,
        completedCases,
        isLoadingCase,
        startCase,
        completeCase,
        loadCase
    };
} 