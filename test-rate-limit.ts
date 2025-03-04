import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testEndpoint(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any) {
  console.log(`\nTesting ${method} ${endpoint}:`);
  const requests = [];
  
  // Make 15 requests (rate limit is 10 per 10s)
  for (let i = 0; i < 15; i++) {
    requests.push(
      axios({
        method,
        url: `${BASE_URL}${endpoint}`,
        data,
        validateStatus: (status) => true // Don't throw on error status
      }).then(response => {
        const remaining = response.headers['x-ratelimit-remaining'];
        const reset = response.headers['x-ratelimit-reset'];
        console.log(
          `Request ${i + 1}: Status ${response.status}`,
          remaining ? `Remaining: ${remaining}` : '',
          reset ? `Reset: ${new Date(parseInt(reset)).toLocaleTimeString()}` : '',
          response.status === 429 ? '(Rate Limited)' : ''
        );
        return response;
      })
    );
    // Add a small delay between requests to avoid overwhelming the server
    await sleep(100);
  }

  const responses = await Promise.all(requests);
  const rateLimited = responses.filter(r => r.status === 429).length;
  console.log(`\nResults for ${endpoint}:`);
  console.log(`- Successful requests: ${responses.filter(r => r.status < 400).length}`);
  console.log(`- Rate limited requests: ${rateLimited}`);
  console.log(`- Other errors: ${responses.filter(r => r.status >= 400 && r.status !== 429).length}`);
}

async function createTestJob() {
  const mockFile = new Blob(['test log content'], { type: 'text/plain' });
  const formData = new FormData();
  formData.append('file', mockFile, 'test.log');
  
  const response = await axios.post(`${BASE_URL}/upload-logs`, formData);
  if (response.status !== 200) {
    throw new Error('Failed to create test job');
  }
  return response.data.jobId;
}

async function runTests() {
  try {
    console.log('Testing /api/stats endpoint...');
    await testEndpoint('/stats');
    await sleep(11000); // Wait for rate limit to reset

    console.log('\nCreating a test job...');
    const jobId = await createTestJob();
    console.log(`Created job with ID: ${jobId}`);
    
    console.log('\nTesting /api/stats/[jobId] endpoint...');
    await testEndpoint(`/stats/${jobId}`);
    await sleep(11000);

    console.log('\nTesting /api/queue-status endpoint...');
    await testEndpoint('/queue-status');
    await sleep(11000);

    console.log('\nTesting /api/upload-logs endpoint...');
    const mockFile = new Blob(['test log content'], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', mockFile, 'test.log');
    await testEndpoint('/upload-logs', 'POST', formData);

  } catch (error) {
    console.error('Test error:', error);
  }
}

console.log('Starting rate limit tests...');
runTests().then(() => console.log('\nTests completed!'));
