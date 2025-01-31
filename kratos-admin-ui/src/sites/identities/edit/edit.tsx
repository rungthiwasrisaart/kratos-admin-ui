import { Stack } from "@fluentui/react";
import { Button, Input, Label, Title1 } from "@fluentui/react-components";
import { Identity, IdentityState, V0alpha2Api } from "@ory/kratos-client";
import React from "react";
import { withRouter } from "react-router-dom";
import { getKratosConfig } from "../../../config";
import { SchemaField, SchemaService } from "../../../service/schema-service";

interface EditIdentityState {
    identity?: Identity
    schemaFields: SchemaFieldWithValue[]
    errorText?: string
    traits: Traits;
}

interface SchemaFieldWithValue extends SchemaField {
    value: any;
}

interface Traits {
    [key: string]: any;
}

class EditIdentitySite extends React.Component<any, EditIdentityState> {

    state: EditIdentityState = {
        schemaFields: [],
        traits: {}
    }

    componentDidMount() {
        this.mapEntity(this.props.match.params.id).then(() => { })
    }

    async mapEntity(id: any): Promise<SchemaFieldWithValue[]> {
        const array: SchemaFieldWithValue[] = []
        const config = await getKratosConfig()
        const adminAPI = new V0alpha2Api(config.adminConfig);
        const entity = await adminAPI.adminGetIdentity(id);
        const schema = await SchemaService.getSchemaJSON(entity.data.schema_id);
        const schemaFields = SchemaService.getSchemaFields(schema);
        const map = SchemaService.mapKratosIdentity(entity.data, schemaFields);

        const traits: Traits = {}
        for (const [key, value] of Object.entries(map)) {
            if (key !== "key") {
                schemaFields.forEach(f => {
                    if (f.name === key) {
                        array.push({
                            name: key,
                            value: value,
                            title: f.title,
                            parentName: f.parentName
                        })

                        if (f.parentName) {
                            if (!traits[f.parentName]) {
                                traits[f.parentName] = {}
                            }
                            traits[f.parentName][key] = value;
                        } else {
                            traits[key] = value;
                        }
                    }
                });
            }
        }
        this.setState({
            identity: entity.data,
            schemaFields: array,
            traits: traits
        })

        return array;
    }

    patchField(field: SchemaFieldWithValue, value: string | undefined) {
        if (value) {
            const traits = this.state.traits;
            if (field.parentName) {
                traits[field.parentName][field.name] = value
            } else {
                traits[field.name] = value;
            }
            this.setState({
                traits: traits
            })
        }
    }

    save() {
        if (this.state.identity) {
            getKratosConfig().then(config => {
                const adminAPI = new V0alpha2Api(config.adminConfig);
                adminAPI.adminUpdateIdentity(this.state.identity?.id!, {
                    schema_id: this.state.identity?.schema_id!,
                    traits: this.state.traits,
                    state: IdentityState.Active
                }).then(data => {
                    this.props.history.push("/identities/" + this.state.identity?.id + "/view")
                }).catch(err => {
                    this.setState({ errorText: JSON.stringify(err.response.data.error) })
                })
            })
        }
    }

    arrayToObject(fields: SchemaFieldWithValue[]): any {
        const obj: any = {}
        fields.forEach(field => {
            obj[field.name] = field.value
        });
        return obj;
    }

    render() {
        return (
            <div className="container">
                <Title1 as={"h1"}>Edit Identity</Title1>
                {!this.state.identity ||
                    <div>
                        {!this.state.errorText || <div className="alert alert-danger">{this.state.errorText}</div>}
                        <div>
                            {this.state.schemaFields.map((elem, key) => {
                                return (
                                    <div key={key}>
                                        <Label htmlFor={"editItem_" + elem.title} style={{ marginTop: 10 }}>
                                            {elem.title}
                                        </Label><br />
                                        <Input
                                            style={{ minWidth: 400 }}
                                            id={"editItem_" + elem.title}
                                            defaultValue={elem.value}
                                            onChange={(event, value) => {
                                                this.patchField(elem, value.value)
                                            }}
                                        />
                                    </div>
                                )
                            })}
                            <div style={{ marginTop: 20 }}>
                                <Stack horizontal tokens={{ childrenGap: 20 }}>
                                    <Button appearance="primary" onClick={() => this.save()}>Save</Button>
                                    <Button onClick={() => this.props.history.push("/identities")}>Close</Button>
                                </Stack>
                            </div>
                        </div>
                    </div>}
            </div>
        )
    }
}

export default withRouter(EditIdentitySite);