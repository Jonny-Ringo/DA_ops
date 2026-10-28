// Chat bubble interactions for the Problem section background.
// Each bubble has a CSS class (cb-1 through cb-12) and an array of exchanges.
// Speaker is either 'customer' or 'agent'.
// Multiple exchanges create a multi-turn conversation within one bubble.
//
// To edit: change the text values below. To remove a bubble, delete the whole object.
// To add one, copy an existing object and give it a new class (cb-13, etc.).
// The renderer scatters bubbles automatically, with spacing between examples.

export const chatBubbles = [

    {
        class: 'cb-1',
        exchanges: [
            { speaker: 'customer', text: 'I spoke to a supervisor who assured me it would be back within 24 hours.' },
            { speaker: 'agent',    text: "I'm sorry you feel you need a supervisor. I assure you I've done everything I can on my end." },
            { speaker: 'customer', text: "What? No - I already spoke with one. My issue still hasn't been fixed, so I'm back here again." },
        ]
    },

    {
        class: 'cb-2',
        exchanges: [
            { speaker: 'customer', text: "I've been waiting 3 days and my order still hasn't shipped. This was guaranteed delivery in 2." },
            { speaker: 'agent',    text: 'I have escalated this issue and you will receive an email confirmation with a tracking number.' },
        ]
    },

    {
        class: 'cb-3',
        exchanges: [
            { speaker: 'customer', text: 'I already explained this to the last agent. Why do I have to start over every time?' },
            { speaker: 'agent',    text: "Apologies, I can see your previous case notes but not the chat history. Could you explain the issue once more?" },
        ]
    },

    {
        class: 'cb-4',
        exchanges: [
            { speaker: 'customer', text: "This error has been happening on 3 different devices and browsers for 3 days straight. I can't place my order." },
            { speaker: 'agent',    text: 'Have you tried clearing your browser cache and cookies?' },
        ]
    },

    {
        class: 'cb-5',
        exchanges: [
            { speaker: 'customer', text: "Can someone actually look into this? I've already submitted 3 tickets on the same issue." },
            { speaker: 'agent',    text: 'Your case has been assigned ticket #847291. Someone will follow up within 2 business days.' },
        ]
    },

    {
        class: 'cb-6',
        exchanges: [
            { speaker: 'customer', text: "This has been going on for two weeks. I still don't have a resolution." },
            { speaker: 'agent',    text: 'I apologize for the inconvenience, I have escalated this issue. Please allow 3 to 5 business days for this to be reviewed.' },
        ]
    },

    {
        class: 'cb-7',
        exchanges: [
            { speaker: 'customer', text: 'I was charged twice for the same order. I need this fixed today.' },
            { speaker: 'agent',    text: 'Please allow up to 10 business days for your refund to be processed.' },
        ]
    },

    {
        class: 'cb-8',
        exchanges: [
            { speaker: 'customer', text: 'I just need to know if my subscription will auto-renew next week. Simple yes or no.' },
            { speaker: 'agent',    text: 'Thank you for contacting support! I will do my best to assist wiht this today. Am I correct that you need help with your subscription auto-renewal?' },
        ]
    },

    {
        class: 'cb-9',
        exchanges: [
            { speaker: 'customer', text: "My account was suspended but I haven't broken any rules. Can you check what happened?" },
            { speaker: 'agent',    text: 'Unfortunately these decisions are final and we cannot restore your account. We are unable to share why.' },
        ]
    },

    {
        class: 'cb-10',
        exchanges: [
            { speaker: 'customer', text: "I reported this exact same problem last month and it's back again." },
            { speaker: 'agent',    text: 'I see this was already addressed in a previous interaction. Can you confirm what the issue still is?' },
        ]
    },

    {
        class: 'cb-11',
        exchanges: [
            { speaker: 'customer', text: "This is the third time I've been transferred. Nobody knows what they're doing." },
            { speaker: 'agent',    text: 'Please hold while I transfer you to the correct department.' },
        ]
    },

    {
        class: 'cb-12',
        exchanges: [
            { speaker: 'customer', text: 'My account keeps getting locked. This is the third time this week.' },
            { speaker: 'agent',    text: 'I understand. Unfortunately I do not have access to make that change.' },
        ]
    },

]
