import React from 'react'
import {
    Box,
} from '@mui/material';
import Page from '../components/Page';
import { NotaEmpenhoTable } from '../sections/@NE'
import { useAPI } from '../contexts/apiContext'


export default function NotaEmpenho() {


    const [empenhos, setEmpenhos] = React.useState([])

    const {
        getNotasEmpenho
    } = useAPI()

    const fetch = async () => {
        let res = await getNotasEmpenho()
        setEmpenhos(res?.dados)
    }

    React.useEffect(() => {
        fetch()
    }, [])

    return (
        <Page title="Controle Orçamentário">
            <Box
                sx={{
                    padding: '15px'
                }}
            >
                <NotaEmpenhoTable {...{ empenhos, onFetchData: fetch }} />
            </Box>
        </Page>
    );
}