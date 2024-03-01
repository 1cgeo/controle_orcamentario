import React from 'react'
import {
    Box,
} from '@mui/material';
import Page from '../components/Page';
import { NotaCreditoTable } from '../sections/@NC'
import { useAPI } from '../contexts/apiContext'


export default function NotaCredito() {


    const [creditNotes, setCreditNotes] = React.useState([])

    const {
        getNotasCredito
    } = useAPI()

    const fetch = async () => {
        let res = await getNotasCredito()
        setCreditNotes(res?.dados)
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
                <NotaCreditoTable {...{ creditNotes, onFetchData: fetch }} />
            </Box>
        </Page>
    );
}