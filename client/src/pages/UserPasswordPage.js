import React from 'react'
import {
    Container,
} from '@mui/material';
import Page from '../components/Page';
import { UserPasswordCard } from '../sections/@user'

export default function UserPasswordPage() {


    return (
        <Page title="Controle Orçamentário">
            <Container maxWidth='sm'>
                <UserPasswordCard />
            </Container>
        </Page>
    );
}