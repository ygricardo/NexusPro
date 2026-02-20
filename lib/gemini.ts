/**
 * Generates clinical session notes by calling the NexusPro Backend API.
 * This ensures API keys are kept secure on the server and provides robust validation.
 */
export const generateSessionNotes = async (
    assessment: string,
    numNotes: number,
    clientName: string,
    location: string = "Home",
    peoplePresent: string = "Caregiver"
) => {
    console.log("NexusPro Client: Contacting Backend for Clinical Note Generation...");

    try {
        const token = localStorage.getItem('nexus_token');
        const response = await fetch('/api/ai/generate-notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
                assessment,
                numNotes,
                clientName,
                location,
                peoplePresent
            }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Failed to generate notes via backend.');
        }

        console.log(`[Client Link] SUCCESS: Notes generated via backend (Model: ${result.modelUsed})`);
        return result.data;

    } catch (error: any) {
        console.error("[Client Link] Error:", error.message);
        throw new Error(`Backend Service Error: ${error.message}`);
    }
};
