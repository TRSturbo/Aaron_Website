document.addEventListener('DOMContentLoaded', function() {
    function calculateDuration(startDate, endDate = null) {
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : new Date();
        
        const years = end.getFullYear() - start.getFullYear();
        const months = end.getMonth() - start.getMonth();
        
        let totalMonths = years * 12 + months;
        
        const yearsDisplay = Math.floor(totalMonths / 12);
        const monthsDisplay = totalMonths % 12;
        
        let durationString = '';
        if (yearsDisplay > 0) {
            durationString += `${yearsDisplay} yr${yearsDisplay > 1 ? 's' : ''} `;
        }
        if (monthsDisplay > 0) {
            durationString += `${monthsDisplay} mo${monthsDisplay > 1 ? 's' : ''}`;
        }
        
        return {
            fullDuration: durationString.trim(),
            endDateLabel: endDate ? endDate : 'Present'
        };
    }

    // Experience Data with date objects
    const experiences = [
        {
            company: "Acuity Brands",
            title: "Senior Manager Software Engineering",
            startDate: "2024-02-01",
            endDate: null,
            location: "Remote",
            description: "Leading software engineering team, driving technical strategy and team development."
        },
        {
            company: "Acuity Brands",
            title: "Senior Software Engineer",
            startDate: "2021-03-01",
            endDate: "2024-02-01",
            location: "",
            description: "Developed and maintained complex software solutions, contributed to technical architecture and team growth."
        },
        {
            company: "Acuity Brands",
            title: "Application Developer",
            startDate: "2015-05-01",
            endDate: "2021-03-01",
            location: "Atlanta Metropolitan Area",
            description: "Designed and implemented web and mobile applications, collaborated on cross-functional projects."
        },
        {
            company: "Apple",
            title: "AppleCare Advisor",
            startDate: "2013-05-01",
            endDate: "2015-05-01",
            location: "",
            description: "Supported wide range of customers and employees at a technical level. Operated as a senior advisor, mentor and team aid. Fell within the top 1% of my area."
        },
        {
            company: "University of Georgia",
            title: "Security",
            startDate: "2013-01-01",
            endDate: "2013-05-01",
            location: "",
            description: "Protected the assets and safety of campus dormitories. First freshman to achieve the position without prior experience."
        },
        {
            company: "Moe's Southwest Grill",
            title: "Manager",
            startDate: "2011-06-01",
            endDate: "2012-08-01",
            location: "",
            description: "Learned discipline of teamwork and leadership. Engaged with team in a learning and hard-working environment dedicated to improvement."
        }
    ];

    // Social Links Data
    const socialLinks = [
        { 
            platform: "LinkedIn", 
            url: "https://www.linkedin.com/in/aaron-tharpe-3a501490/", 
            icon: "fab fa-linkedin" 
        },
        { 
            platform: "GitHub", 
            url: "https://github.com/trsturbo", 
            icon: "fab fa-github" 
        }
    ];

    // Render Experience Cards
    const experienceContainer = document.getElementById('experience-cards');
    experiences.forEach(exp => {
        const duration = calculateDuration(exp.startDate, exp.endDate);
        
        const card = document.createElement('div');
        card.classList.add('experience-card');
        card.innerHTML = `
            <h3>${exp.company}</h3>
            <h4>${exp.title}</h4>
            <p class="duration">${duration.fullDuration} · ${exp.startDate.split('-')[0]} - ${duration.endDateLabel.split('-')[0] || 'Present'}</p>
            ${exp.location ? `<p class="location">${exp.location}</p>` : ''}
            <p>${exp.description}</p>
        `;
        experienceContainer.appendChild(card);
    });

    // Render Social Links
    const socialContainer = document.getElementById('social-links');
    socialLinks.forEach(link => {
        const socialLink = document.createElement('a');
        socialLink.href = link.url;
        socialLink.classList.add('social-link');
        socialLink.target = "_blank";
        socialLink.innerHTML = `<i class="${link.icon}"></i>`;
        socialContainer.appendChild(socialLink);
    });
});
