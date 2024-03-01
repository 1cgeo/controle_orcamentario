import React from 'react'
import {
    Container,
} from '@mui/material';
import Page from '../components/Page';
import { UserInfoCard } from '../sections/@user';

export default function UserInfoPage() {

    return (
        <Page title="Controle Orçamentário">
            <Container maxWidth='sm'>
                <UserInfoCard/>
            </Container>
        </Page>
    );
}