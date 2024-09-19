import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
  ThemeProvider, createTheme, CssBaseline,
  Container, Typography, Button, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Avatar,
  TextField, Box, CircularProgress,
  Pagination, Autocomplete, IconButton
} from '@mui/material';
import { SwapHoriz } from '@mui/icons-material';
import './App.css';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#ff007a' },
    background: { default: '#191b1f', paper: '#212429' },
  },
});

const API_URL = 'https://yields.llama.fi/pools';
const PROTOCOLS_URL = 'https://api.llama.fi/protocols';
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

const formatVolume = (volume) => {
  if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
  return `$${volume.toFixed(2)}`;
};

function App() {
  const [tokens, setTokens] = useState([]);
  const [tokenA, setTokenA] = useState('');
  const [tokenB, setTokenB] = useState('');
  const [results, setResults] = useState([]);
  const [protocols, setProtocols] = useState({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [resultsPerPage] = useState(20);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchTokens = useCallback(async () => {
    try {
      const response = await axios.get(`${COINGECKO_API}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 250,
          page: 1,
          sparkline: false
        }
      });
      const verifiedTokens = response.data.map(coin => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        icon: coin.image
      }));
      setTokens(verifiedTokens);
    } catch (error) {
      console.error('Error fetching tokens:', error);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
    fetchProtocols();
  }, [fetchTokens]);

  const fetchProtocols = useCallback(async () => {
    try {
      const response = await axios.get(PROTOCOLS_URL);
      const protocolsMap = {};
      response.data.forEach(protocol => {
        protocolsMap[protocol.slug] = protocol.url;
      });
      setProtocols(protocolsMap);
    } catch (error) {
      console.error('Error fetching protocols:', error);
    }
  }, []);

  const fetchResults = useCallback(async () => {
    if (!tokenA || !tokenB) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const response = await axios.get(API_URL);
      console.log('API Response:', response.data);

      if (!Array.isArray(response.data.data)) {
        console.error('Unexpected API response structure:', response.data);
        setResults([]);
        return;
      }

      const relevantPools = response.data.data.filter(pool => {
        const [lendToken, borrowToken] = (pool.symbol || '').split('-');
        return (lendToken === tokenA && borrowToken === tokenB) || 
               (lendToken === tokenB && borrowToken === tokenA);
      });

      console.log('Relevant Pools:', relevantPools);

      const processedResults = relevantPools
        .map(pool => {
          const [lendToken, borrowToken] = pool.symbol.split('-');
          return {
            lendToken: lendToken,
            borrowToken: borrowToken,
            lendRate: pool.apy,
            borrowRate: pool.apyBorrow || pool.apyBaseBorrow || (pool.apys && pool.apys.borrow) || 'N/A',
            volume: pool.tvlUsd,
            platform: pool.project,
            chain: pool.chain,
            url: protocols[pool.project] || `https://defillama.com/protocol/${pool.project}`
          };
        })
        .filter(result => result.lendRate > 0.01)
        .sort((a, b) => b.lendRate - a.lendRate);

      console.log('Processed and Sorted Results:', processedResults);

      setResults(processedResults);
    } catch (error) {
      console.error('Error fetching results:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [tokenA, tokenB, protocols]);

  const paginatedResults = useMemo(() => {
    const startIndex = (page - 1) * resultsPerPage;
    return results.slice(startIndex, startIndex + resultsPerPage);
  }, [results, page, resultsPerPage]);

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const handleSwapTokens = () => {
    setTokenA(tokenB);
    setTokenB(tokenA);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container maxWidth="md" style={{ 
        marginTop: '40px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <Typography variant="h4" align="center" style={{ marginBottom: '40px', color: '#ff007a' }}>
          DeFi Lending/Borrowing Rate Comparison
        </Typography>
        
        <Paper style={{ padding: '40px', marginBottom: '40px', backgroundColor: '#2c2f36', width: '100%', maxWidth: '600px' }}>
          <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
              <Autocomplete
                value={tokens.find(t => t.symbol === tokenA) || null}
                onChange={(event, newValue) => {
                  console.log('TokenA selected:', newValue ? newValue.symbol : '');
                  setTokenA(newValue ? newValue.symbol : '');
                }}
                options={tokens}
                getOptionLabel={(option) => option.symbol}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Lending Token (A)"
                    variant="outlined"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          {tokenA && (
                            <img
                              src={tokens.find(t => t.symbol === tokenA)?.icon}
                              alt={tokenA}
                              style={{width: 20, height: 20, marginRight: 8}}
                            />
                          )}
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
                    <img src={option.icon} alt={option.symbol} style={{width: 20, height: 20, marginRight: 10}} />
                    {option.symbol}
                  </Box>
                )}
                style={{ width: '45%' }}
              />
              <IconButton onClick={handleSwapTokens} color="primary">
                <SwapHoriz />
              </IconButton>
              <Autocomplete
                value={tokens.find(t => t.symbol === tokenB) || null}
                onChange={(event, newValue) => {
                  console.log('TokenB selected:', newValue ? newValue.symbol : '');
                  setTokenB(newValue ? newValue.symbol : '');
                }}
                options={tokens}
                getOptionLabel={(option) => option.symbol}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Borrowing Token (B)"
                    variant="outlined"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          {tokenB && (
                            <img
                              src={tokens.find(t => t.symbol === tokenB)?.icon}
                              alt={tokenB}
                              style={{width: 20, height: 20, marginRight: 8}}
                            />
                          )}
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
                    <img src={option.icon} alt={option.symbol} style={{width: 20, height: 20, marginRight: 10}} />
                    {option.symbol}
                  </Box>
                )}
                style={{ width: '45%' }}
              />
            </Box>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={fetchResults}
              style={{ width: '100%', marginTop: '20px' }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'where to lend'}
            </Button>
          </Box>
        </Paper>

        {hasSearched && (
          <>
            <TableContainer component={Paper} style={{ backgroundColor: '#2c2f36', marginBottom: '20px', width: '100%' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rank</TableCell>
                    <TableCell>Lend (A)</TableCell>
                    <TableCell>Borrow (B)</TableCell>
                    <TableCell>Lend Rate (%)</TableCell>
                    <TableCell>Borrow Rate (%)</TableCell>
                    <TableCell>Volume</TableCell>
                    <TableCell>Platform</TableCell>
                    <TableCell>Chain</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedResults.map((result, index) => (
                    <TableRow key={`${result.platform}-${index}`}>
                      <TableCell>{(page - 1) * resultsPerPage + index + 1}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Avatar src={tokens.find(t => t.symbol === result.lendToken)?.icon} alt={result.lendToken} style={{width: 20, height: 20, marginRight: 10}} />
                          {result.lendToken}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Avatar src={tokens.find(t => t.symbol === result.borrowToken)?.icon} alt={result.borrowToken} style={{width: 20, height: 20, marginRight: 10}} />
                          {result.borrowToken}
                        </Box>
                      </TableCell>
                      <TableCell>{result.lendRate > 0 ? `${result.lendRate.toFixed(2)}%` : 'N/A'}</TableCell>
                      <TableCell>{result.borrowRate !== 'N/A' ? `${Number(result.borrowRate).toFixed(2)}%` : 'N/A'}</TableCell>
                      <TableCell>{formatVolume(result.volume)}</TableCell>
                      <TableCell>
                        <a href={result.url} target="_blank" rel="noopener noreferrer" style={{ color: '#ff007a', textDecoration: 'none' }}>
                          {result.platform}
                        </a>
                      </TableCell>
                      <TableCell>{result.chain}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box display="flex" justifyContent="center" marginTop={2} marginBottom={4}>
              <Pagination 
                count={Math.ceil(results.length / resultsPerPage)} 
                page={page} 
                onChange={handlePageChange}
                color="primary"
                size="large"
              />
            </Box>
          </>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;