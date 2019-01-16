import React from "react";
import FromGroup from "../../components/FormGroup/FormGroup";
import Input from "../../components/Input/Input";
import PageWrapper from "../../components/PageWrapper/PageWrapper";
import Button from "../../components/Button/Button";
import ProfileForm from "../../components/ProfileForm";
import PartnesForm from "../../components/PartnesForm";
import { searchUser, addUserAsPartner } from "../../services/user";
import _get from "lodash/get";
import { getAuth } from "../../services/localStorage";
import {
  updateMessage,
  updateErrorMessage
} from "../../redux/store/Feedback/feedback";

const partnersDefault = {
  isQuerying: false,
  isAdding: false,
  isRemoving: false,
  value: "",
  results: [],
  adds: []
};

const stateDefault = {
  data: {
    nome: "",
    telefone: "",
    cidade: "",
    nascimento: "",
    telefone_de_emergencia: "",
    nome_de_emergencia: ""
  },
  partners: partnersDefault
};

class Profile extends React.Component {
  state = {
    ...stateDefault
  };

  componentDidMount = () => {
    this.props.dispatch(updateMessage("Adicionado com sucesso."));
  };

  onChangeHandler = ({ target: { name, value } }) => {
    this.setState({
      data: {
        ...this.state.data,
        [name]: value
      }
    });
  };

  fetchSearchUser = () => {
    this.setState(
      { partners: { ...this.state.partners, isQuerying: true } },
      async () => {
        try {
          const search = _get(this.state, "partners.value");
          const { user } = await searchUser(search);
          this.setState({
            partners: {
              ...this.state.partners,
              results: user,
              isQuerying: false
            }
          });
        } catch (error) {}
      }
    );
  };

  onQueryPartners = ({ target: { value } }) => {
    this.setState(
      { partners: { ...this.state.partners, results: [], value } },
      () => {
        if (value.length > 4) {
          this.fetchSearchUser();
        }
      }
    );
  };

  addPartnerHandler = (partner_id, event) => {
    event.preventDefault();
    this.setState(
      {
        partners: { ...this.state.partners, isAdding: true }
      },
      async () => {
        try {
          // const { _id } = await getAuth();
          const _id = "5c3e63cb7b4d6207601b3ab9";
          const promises = [
            addUserAsPartner({
              _id,
              partner_id
            }),
            addUserAsPartner({
              _id: partner_id,
              partner_id: _id
            })
          ];
          await Promise.all(promises);
          this.setState({ partners: partnersDefault });
          this.props.dispatch(updateMessage("Adicionado com sucesso."));
        } catch (error) {}
      }
    );
  };

  render() {
    return (
      <PageWrapper title="Dados Pessoais">
        <div className="m-bottom-40">
          <FromGroup title="Dados pessoais" formName="Dados do voluntário">
            <ProfileForm
              {...this.state.data}
              onChangeHandler={this.onChangeHandler}
            />
          </FromGroup>
          <FromGroup title="Conjugue e familiares no GAS">
            <PartnesForm
              {...this.state.partners}
              addPartner={this.addPartnerHandler}
              onChange={this.onQueryPartners}
            />
          </FromGroup>
          <div className="d-flex d-flex-space-between">
            <div>
              <Button type="primary">Salvar</Button>
              <Button className="m-left-10">Editar</Button>
            </div>
            <Button type="danger">Alterar minha senha</Button>
          </div>
        </div>
      </PageWrapper>
    );
  }
}

export default Profile;
