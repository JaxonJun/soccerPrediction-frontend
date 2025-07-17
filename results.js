// Load data when page loads
window.addEventListener('DOMContentLoaded', async () => {
  await loadTodayMatches();
  await loadRecentResults();
  await loadWinners();

  // Add event listener for refresh button
  document.getElementById('refreshResults').addEventListener('click', async () => {
    await loadTodayMatches(true);
    await loadRecentResults(true);
    await loadWinners(true);
  });
});

// Search functionality
document.getElementById('searchButton').addEventListener('click', async () => {
  const username = document.getElementById('searchUsername').value.trim();
  const ticketId = document.getElementById('searchTicketId').value.trim();
  
  if (!username && !ticketId) {
    alert('Please enter a username or ticket ID to search');
    return;
  }
  
  await searchTickets(username, ticketId);
});

// Also trigger search on Enter key
document.getElementById('searchUsername').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('searchButton').click();
  }
});

document.getElementById('searchTicketId').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('searchButton').click();
  }
});

// Load today's matches
async function loadTodayMatches(isRefresh = false) {
  const todayMatchesContainer = document.getElementById('todayMatchesContainer');
  
  if (isRefresh) {
    todayMatchesContainer.innerHTML = `
      <div class="text-center py-3">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Refreshing today's matches...</p>
      </div>
    `;
  }
  
  try {
    // Get all matches
    const response = await fetch('http://localhost:3000/api/all-matches');
    if (!response.ok) {
      throw new Error('Failed to fetch matches');
    }
    
    const matches = await response.json();
    
    if (!matches || matches.length === 0) {
      todayMatchesContainer.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle me-2"></i>
          No matches scheduled for today.
        </div>
      `;
      return;
    }
    
    // Filter for today's matches (matches with recent updates)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayMatches = matches.filter(match => {
      const matchDate = new Date(match.lastUpdated);
      matchDate.setHours(0, 0, 0, 0);
      return matchDate.getTime() === today.getTime();
    });
    
    if (todayMatches.length === 0) {
      todayMatchesContainer.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle me-2"></i>
          No matches scheduled for today.
        </div>
      `;
      return;
    }
    
    // Group matches by sport key
    const matchesByLeague = {};
    todayMatches.forEach(match => {
      const league = match.sportKey || 'Unknown League';
      if (!matchesByLeague[league]) {
        matchesByLeague[league] = [];
      }
      matchesByLeague[league].push(match);
    });
    
    // Display today's matches
    let html = '';
    
    Object.keys(matchesByLeague).forEach(league => {
      html += `<h5 class="mb-3">${league}</h5>`;
      
      html += `
        <div class="table-responsive mb-4">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Match</th>
                <th>Score</th>
                <th>Status</th>
                <th>Odds (Home)</th>
                <th>Odds (Draw)</th>
                <th>Odds (Away)</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      matchesByLeague[league].forEach(match => {
        const scoreDisplay = match.scoreA !== null && match.scoreB !== null && match.scoreA !== undefined && match.scoreB !== undefined
          ? `${match.scoreA} - ${match.scoreB}` 
          : 'pending';
        
        html += `
          <tr>
            <td>
              <strong>${match.teamA}</strong> vs <strong>${match.teamB}</strong>
            </td>
            <td>${scoreDisplay}</td>
            <td>
              <span class="badge ${match.status === 'completed' ? 'bg-success' : 'bg-warning text-dark'}">
                ${match.status || 'pending'}
              </span>
            </td>
            <td>${match.oddsA ? match.oddsA.toFixed(2) : 'N/A'}</td>
            <td>${match.drawOdds ? match.drawOdds.toFixed(2) : 'N/A'}</td>
            <td>${match.oddsB ? match.oddsB.toFixed(2) : 'N/A'}</td>
          </tr>
        `;
      });
      
      html += `
            </tbody>
          </table>
        </div>
      `;
    });
    
    todayMatchesContainer.innerHTML = html;
    
  } catch (error) {
    console.error('Error loading today\'s matches:', error);
    todayMatchesContainer.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Error loading today's matches. Please try again.
      </div>
    `;
  }
}

// Search for tickets
async function searchTickets(username, ticketId) {
  const resultsContainer = document.getElementById('searchResultsContainer');
  resultsContainer.innerHTML = `
    <div class="text-center py-3">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2">Searching...</p>
    </div>
  `;
  
  try {
    let ticket = null;
    
    // Try to find by ticket ID first
    if (ticketId) {
      try {
        const ticketResponse = await fetch(`http://localhost:3000/api/ticket/${ticketId}`);
        if (ticketResponse.ok) {
          ticket = await ticketResponse.json();
          username = ticket.username; // Set username for match lookup
        }
      } catch (error) {
        console.log('Ticket not found by ID');
      }
    }
    
    // If no ticket found and username provided, try to find by username
    if (!ticket && username) {
      try {
        const userResponse = await fetch(`http://localhost:3000/api/user-predictions/${username}`);
        if (userResponse.ok) {
          const user = await userResponse.json();
          if (user && user.ticketId) {
            const ticketResponse = await fetch(`http://localhost:3000/api/ticket/${user.ticketId}`);
            if (ticketResponse.ok) {
              ticket = await ticketResponse.json();
            }
          }
        }
      } catch (error) {
        console.log('User or ticket not found by username');
      }
    }
    
    if (!ticket) {
      resultsContainer.innerHTML = `
        <div class="no-results">
          <i class="bi bi-exclamation-circle"></i>
          <h4>No results found</h4>
          <p class="text-muted">We couldn't find any tickets matching your search criteria</p>
        </div>
      `;
      return;
    }
    
    // Get match details for each prediction
    const matchPromises = ticket.predictions.map(pred => 
      fetch(`http://localhost:3000/api/results/${pred.matchId}`)
        .then(res => res.ok ? res.json() : null)
        .catch(() => null)
    );
    
    const matches = await Promise.all(matchPromises);
    const validMatches = matches.filter(match => match !== null);
    
    // Display the ticket with match details
    displayTicketWithMatches(ticket, validMatches, resultsContainer);
    
  } catch (error) {
    console.error('Error searching tickets:', error);
    resultsContainer.innerHTML = `
      <div class="alert alert-danger">
        <h5>Error searching tickets</h5>
        <p>An error occurred while searching for tickets. Please try again.</p>
      </div>
    `;
  }
}

// Load recent results
async function loadRecentResults(isRefresh = false) {
  const resultsContainer = document.getElementById('recentResultsContainer');
  
  if (isRefresh) {
    resultsContainer.innerHTML = `
      <div class="text-center py-3">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Refreshing recent results...</p>
      </div>
    `;
  }
  
  try {
    // Get all tickets
    const response = await fetch('http://localhost:3000/api/all-tickets');
    if (!response.ok) {
      throw new Error('Failed to fetch tickets');
    }
    
    const tickets = await response.json();
    
    if (!tickets || tickets.length === 0) {
      resultsContainer.innerHTML = `
        <div class="no-results">
          <i class="bi bi-calendar-x"></i>
          <h4>No recent results</h4>
          <p class="text-muted">There are no recent prediction results to display</p>
        </div>
      `;
      return;
    }
    
    // Sort tickets by creation date (newest first)
    tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Take only the 10 most recent tickets
    const recentTickets = tickets.slice(0, 10);
    
    // Display recent tickets
    let html = `<h5 class="mb-3">Recent Predictions</h5>`;
    
    recentTickets.forEach(ticket => {
      const statusClass = ticket.status === 'win' ? 'win' : ticket.status === 'lose' ? 'lose' : 'pending';
      const statusBadgeClass = ticket.status === 'win' ? 'status-win' : ticket.status === 'lose' ? 'status-lose' : 'status-pending';
      
      html += `
        <div class="card ticket-card ${statusClass} mb-3 animate-fadeIn">
          <div class="card-body">
            <div class="ticket-header">
              <div>
                <h5 class="mb-0">${ticket.username}'s Prediction</h5>
                <div class="small text-muted">${new Date(ticket.createdAt).toLocaleString()}</div>
              </div>
              <span class="prediction-status ${statusBadgeClass}">${ticket.status || 'pending'}</span>
            </div>
            <div class="mb-2">
              <strong>Ticket ID:</strong> <span class="ticket-id">${ticket.ticketId}</span>
            </div>
            <div class="mt-3">
              <button class="btn btn-sm btn-outline-primary view-details" data-ticket-id="${ticket.ticketId}" data-username="${ticket.username}">
                <i class="bi bi-eye me-1"></i> View Details
              </button>
            </div>
          </div>
        </div>
      `;
    });
    
    resultsContainer.innerHTML = html;
    
    // Add event listeners to view details buttons
    document.querySelectorAll('.view-details').forEach(button => {
      button.addEventListener('click', async () => {
        const ticketId = button.dataset.ticketId;
        const username = button.dataset.username;
        await searchTickets(username, ticketId);
        
        // Switch to search results tab
        document.getElementById('search-tab').click();
      });
    });
    
  } catch (error) {
    console.error('Error loading recent results:', error);
    resultsContainer.innerHTML = `
      <div class="alert alert-danger">
        <h5>Error loading recent results</h5>
        <p>An error occurred while loading recent results. Please try again.</p>
      </div>
    `;
  }
}

// Load winners
async function loadWinners(isRefresh = false) {
  const winnersContainer = document.getElementById('winnersContainer');
  
  if (isRefresh) {
    winnersContainer.innerHTML = `
      <div class="text-center py-3">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Refreshing winners...</p>
      </div>
    `;
  }
  
  try {
    // Get all tickets
    const response = await fetch('http://localhost:3000/api/all-tickets');
    if (!response.ok) {
      throw new Error('Failed to fetch tickets');
    }
    
    const tickets = await response.json();
    
    // Filter winning tickets
    const winningTickets = tickets.filter(ticket => ticket.status === 'win');
    
    if (!winningTickets || winningTickets.length === 0) {
      winnersContainer.innerHTML = `
        <div class="no-results">
          <i class="bi bi-trophy"></i>
          <h4>No winners yet</h4>
          <p class="text-muted">There are no winning predictions to display</p>
        </div>
      `;
      return;
    }
    
    // Sort winning tickets by creation date (newest first)
    winningTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Display winners
    let html = `
      <h5 class="mb-3">Winners</h5>
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Username</th>
              <th>Date</th>
              <th>Predictions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    winningTickets.forEach(ticket => {
      html += `
        <tr>
          <td>
            <strong>${ticket.username}</strong>
            <span class="prediction-status status-win ms-2">Winner</span>
          </td>
          <td>${new Date(ticket.createdAt).toLocaleDateString()}</td>
          <td>${ticket.predictions.length} predictions</td>
          <td>
            <button class="btn btn-sm btn-outline-primary view-details" data-ticket-id="${ticket.ticketId}" data-username="${ticket.username}">
              <i class="bi bi-eye me-1"></i> View Details
            </button>
          </td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    winnersContainer.innerHTML = html;
    
    // Add event listeners to view details buttons
    document.querySelectorAll('.view-details').forEach(button => {
      button.addEventListener('click', async () => {
        const ticketId = button.dataset.ticketId;
        const username = button.dataset.username;
        await searchTickets(username, ticketId);
        
        // Switch to search results tab
        document.getElementById('search-tab').click();
      });
    });
    
  } catch (error) {
    console.error('Error loading winners:', error);
    winnersContainer.innerHTML = `
      <div class="alert alert-danger">
        <h5>Error loading winners</h5>
        <p>An error occurred while loading winners. Please try again.</p>
      </div>
    `;
  }
}

// Display ticket with match details
function displayTicketWithMatches(ticket, matches, container) {
  const statusClass = ticket.status === 'win' ? 'win' : ticket.status === 'lose' ? 'lose' : 'pending';
  const statusBadgeClass = ticket.status === 'win' ? 'status-win' : ticket.status === 'lose' ? 'status-lose' : 'status-pending';
  
  let html = `
    <div class="card ticket-card ${statusClass} mb-4 animate-fadeIn">
      <div class="card-body">
        <div class="ticket-header">
          <div>
            <h5 class="mb-0">${ticket.username}'s Prediction</h5>
            <div class="small text-muted">${new Date(ticket.createdAt).toLocaleString()}</div>
          </div>
          <span class="prediction-status ${statusBadgeClass}">${ticket.status || 'pending'}</span>
        </div>
        <div class="mb-3">
          <strong>Ticket ID:</strong> <span class="ticket-id">${ticket.ticketId}</span>
        </div>
        <h6 class="mb-3">Predictions:</h6>
  `;
  
  // Add each prediction with match details
  ticket.predictions.forEach(pred => {
    const match = matches.find(m => m.matchId === pred.matchId);
    
    if (match) {
      // Determine if prediction was correct
      let resultClass = 'bg-warning text-dark';
      let resultText = 'Pending';
      
      if (match.result) {
        if (match.result === pred.selectedTeam) {
          resultClass = 'bg-success';
          resultText = 'Correct';
        } else {
          resultClass = 'bg-danger';
          resultText = 'Incorrect';
        }
      }
      
      html += `
        <div class="card mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="mb-0">${match.teamA} vs ${match.teamB}</h6>
              <span class="badge ${resultClass}">${resultText}</span>
            </div>
            
            <div class="row mb-2">
              <div class="col-md-4">
                <strong>Your Prediction:</strong> 
                ${pred.selectedTeam === 'teamA' ? match.teamA : pred.selectedTeam === 'teamB' ? match.teamB : 'Draw'}
              </div>
              <div class="col-md-4">
                <strong>Current Score:</strong> 
                ${match.scoreA !== null && match.scoreA !== undefined ? match.scoreA : 'pending'} - ${match.scoreB !== null && match.scoreB !== undefined ? match.scoreB : 'pending'}
              </div>
              <div class="col-md-4">
                <strong>Status:</strong> ${match.status || 'pending'}
              </div>
            </div>
            
            <div class="row">
              <div class="col-md-4">
                <strong>${match.teamA} Odds:</strong> ${match.oddsA ? match.oddsA.toFixed(2) : 'N/A'}
              </div>
              <div class="col-md-4">
                <strong>Draw Odds:</strong> ${match.drawOdds ? match.drawOdds.toFixed(2) : 'N/A'}
              </div>
              <div class="col-md-4">
                <strong>${match.teamB} Odds:</strong> ${match.oddsB ? match.oddsB.toFixed(2) : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      // Match not found
      html += `
        <div class="alert alert-warning">
          <p>Match information not available</p>
          <p>Prediction: ${pred.selectedTeam}</p>
        </div>
      `;
    }
  });
  
  html += `
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}